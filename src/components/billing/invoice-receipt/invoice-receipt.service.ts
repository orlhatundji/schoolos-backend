import { Injectable, Logger } from '@nestjs/common';
import { PlatformTransactionOperation } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { PdfService } from '../../../shared/services/pdf.service';
import { Money } from '../../payments/domain/money';
import { StorageService } from '../../storage/storage.service';
import { MailQueueService } from '../../../utils/mail-queue/mail-queue.service';

@Injectable()
export class InvoiceReceiptService {
  private readonly logger = new Logger(InvoiceReceiptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
    private readonly mailQueueService: MailQueueService,
  ) {}

  async sendReceipt(reference: string, paidByUserId: string): Promise<void> {
    const platformTx = await this.prisma.platformTransaction.findUnique({
      where: { paymentReference: reference },
    });
    if (!platformTx || platformTx.operationType !== PlatformTransactionOperation.SCHOOL_INVOICE) return;
    if (platformTx.receiptSentAt) return;

    const invoice = await this.prisma.schoolInvoice.findUniqueOrThrow({
      where: { id: platformTx.operationId },
      include: {
        school: true,
        term: { include: { academicSession: true } },
      },
    });

    const paystackEvent = await this.prisma.paystackEvent.findFirst({
      where: { reference, eventType: 'charge.success' },
      orderBy: { createdAt: 'desc' },
    });

    const methodDisplay = this.formatMethod(paystackEvent?.payload);

    const templateData = {
      school: { name: invoice.school.name },
      invoice: {
        termLabel: `${invoice.term.academicSession.academicYear} · ${invoice.term.name}`,
        studentCount: invoice.studentCount,
        unitFeeDisplay: formatNaira(Number(invoice.unitFee)),
      },
      transaction: {
        reference,
        amountDisplay: formatNaira(Money.fromNaira(platformTx.totalCharged).toNaira()),
        paidAtDisplay: formatLagosTimestamp(platformTx.settledAt ?? platformTx.createdAt),
        methodDisplay,
      },
    };

    const html = this.pdfService.renderInvoicePaymentReceiptHtml(templateData);
    const pdf = await this.pdfService.generateInvoicePaymentReceiptPDF(templateData);

    const key = `schos/receipts/invoices/${invoice.schoolId}/${reference}.pdf`;
    const { publicUrl } = await this.storageService.uploadBuffer(
      'receipts',
      'application/pdf',
      pdf,
      key,
    );

    await this.prisma.platformTransaction.update({
      where: { id: platformTx.id },
      data: { receiptUrl: publicUrl, receiptSentAt: new Date() },
    });

    const recipient = paidByUserId
      ? await this.prisma.user.findUnique({
          where: { id: paidByUserId },
          select: { email: true, firstName: true, lastName: true },
        })
      : null;

    if (!recipient?.email) {
      this.logger.warn(
        `No recipient email for invoice receipt ${reference} (paidByUserId=${paidByUserId}); skipping send`,
      );
      return;
    }

    await this.mailQueueService.add({
      recipientAddress: recipient.email,
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      subject: `Receipt · ${templateData.transaction.amountDisplay} to Schos · ${reference}`,
      html,
      attachments: [
        {
          filename: `schos-receipt-${reference}.pdf`,
          contentBase64: pdf.toString('base64'),
          contentType: 'application/pdf',
        },
      ],
    });
  }

  private formatMethod(payload: unknown): string {
    if (!payload || typeof payload !== 'object') return 'Card';
    const auth = (payload as { authorization?: { brand?: string; last4?: string; bank?: string } })
      .authorization;
    if (!auth) return 'Card';
    const brand = auth.brand ? capitalize(auth.brand) : 'Card';
    const last4 = auth.last4 ? `ending ${auth.last4}` : '';
    const bank = auth.bank ?? '';
    return [brand, last4, bank].filter(Boolean).join(' · ');
  }
}

function formatNaira(value: number): string {
  return `₦${value.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatLagosTimestamp(date: Date | null): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return '—';
  return d
    .toLocaleString('en-NG', {
      timeZone: 'Africa/Lagos',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
