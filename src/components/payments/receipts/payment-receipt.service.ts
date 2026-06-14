import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus, PlatformTransactionOperation } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { PdfService } from '../../../shared/services/pdf.service';
import { MailQueueService } from '../../../utils/mail-queue/mail-queue.service';
import { EmailAttachment } from '../../../utils/mail/types';
import { StorageService } from '../../storage/storage.service';
import { Money } from '../domain/money';
import { ReceiptTemplateData } from './receipt-template-data';

interface PaystackAuthorization {
  brand?: string;
  last4?: string;
  bank?: string;
  channel?: string;
}

@Injectable()
export class PaymentReceiptService {
  private readonly logger = new Logger(PaymentReceiptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
    private readonly mailQueueService: MailQueueService,
  ) {}

  /**
   * Build and dispatch a receipt for a single Paystack-confirmed charge.
   * Idempotency: PlatformTransaction.receiptSentAt is set after enqueue, so
   * duplicate event handling (re-firing PAYMENT_COMPLETED) won't re-send.
   * Failures are logged, not rethrown — receipt failures must not roll back
   * the underlying payment.
   */
  async sendReceipt(reference: string): Promise<void> {
    try {
      const context = await this.loadContext(reference);
      if (!context) return;

      if (context.platformTx.receiptSentAt) {
        this.logger.log(`Receipt already sent for ${reference}; skipping`);
        return;
      }

      const logoSrc = await this.resolveLogoSrc(context.platformTx.school.logoUrl ?? null);
      const templateData = this.buildTemplateData(context, logoSrc);
      const html = this.pdfService.renderReceiptHtml(templateData);
      const pdfBuffer = await this.pdfService.generateReceiptPDF(templateData);

      const { publicUrl } = await this.storageService.uploadBuffer(
        'receipts',
        'application/pdf',
        pdfBuffer,
        `${context.platformTx.schoolId}/${reference}.pdf`,
      );

      await this.prisma.platformTransaction.update({
        where: { id: context.platformTx.id },
        data: { receiptUrl: publicUrl, receiptSentAt: new Date() },
      });

      const recipients = this.collectRecipients(context);
      if (recipients.length === 0) {
        this.logger.warn(`No recipients for receipt ${reference}; PDF archived only`);
        return;
      }

      const attachment: EmailAttachment = {
        filename: `receipt-${reference}.pdf`,
        contentBase64: pdfBuffer.toString('base64'),
        contentType: 'application/pdf',
      };

      const subject = `Receipt · ₦${formatNaira(templateData.transaction.breakdown.totalNaira)} to ${templateData.school.name} · ${reference}`;
      const text = this.buildPlainText(templateData);

      for (const recipient of recipients) {
        await this.mailQueueService.add({
          recipientAddress: recipient.email,
          recipientName: recipient.name,
          subject,
          html,
          text,
          attachments: [attachment],
        });
      }

      this.logger.log(
        `Receipt ${reference} queued to ${recipients.length} recipient(s); pdf=${publicUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send receipt for ${reference}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async loadContext(reference: string) {
    const platformTx = await this.prisma.platformTransaction.findUnique({
      where: { paymentReference: reference },
      include: {
        school: {
          include: { primaryAddress: true },
        },
      },
    });

    if (!platformTx || platformTx.operationType !== PlatformTransactionOperation.STUDENT_PAYMENT) {
      this.logger.warn(`Receipt context missing for ${reference}; skipping`);
      return null;
    }

    const studentPayment = await this.prisma.studentPayment.findUnique({
      where: { id: platformTx.operationId },
      include: {
        paymentStructure: {
          include: { academicSession: true, term: true },
        },
        student: {
          include: {
            user: true,
            guardian: { include: { user: true } },
            classArmStudents: {
              where: { isActive: true },
              include: { classArm: { include: { level: true } } },
            },
          },
        },
      },
    });

    if (!studentPayment) {
      this.logger.warn(`StudentPayment ${platformTx.operationId} missing for ${reference}`);
      return null;
    }

    const paystackEvent = await this.prisma.paystackEvent.findFirst({
      where: { reference, eventType: 'charge.success' },
      orderBy: { createdAt: 'desc' },
    });

    return { platformTx, studentPayment, paystackEvent };
  }

  private buildTemplateData(
    context: NonNullable<Awaited<ReturnType<PaymentReceiptService['loadContext']>>>,
    logoSrc: string,
  ): ReceiptTemplateData {
    const { platformTx, studentPayment, paystackEvent } = context;
    const student = studentPayment.student;
    const school = platformTx.school;
    const paymentStructure = studentPayment.paymentStructure;

    const authorization = this.extractAuthorization(paystackEvent?.payload);
    const channel = this.extractChannel(paystackEvent?.payload);

    const activeEnrollment = student.classArmStudents[0];
    const className = activeEnrollment
      ? `${activeEnrollment.classArm.level?.name ?? ''} ${activeEnrollment.classArm.name}`.trim() ||
        activeEnrollment.classArm.name
      : null;

    const totalAmount = Money.fromNaira(studentPayment.amount).toNaira();
    const paidToDate = Money.fromNaira(studentPayment.paidAmount).toNaira();
    const thisTxFee = Money.fromNaira(platformTx.feeAmount).toNaira();
    const previouslyPaid = Math.max(0, paidToDate - thisTxFee);
    const outstanding = Math.max(0, totalAmount - paidToDate);

    return {
      school: {
        name: school.name,
        logoSrc,
        addressLine: this.formatAddress(school.primaryAddress),
        phone: school.phone ?? null,
        email: school.email ?? null,
        website: school.website ?? null,
      },
      student: {
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        studentNo: student.studentNo,
        className,
      },
      payment: {
        structureName: paymentStructure.name,
        sessionName: paymentStructure.academicSession?.academicYear ?? null,
        termName: paymentStructure.term?.name ?? null,
        overallStatus: studentPayment.status,
        totalFeeNaira: totalAmount,
        previouslyPaidNaira: previouslyPaid,
        paidToDateNaira: paidToDate,
        outstandingNaira: outstanding,
      },
      transaction: {
        amountNaira: Money.fromNaira(platformTx.totalCharged).toNaira(),
        paidAtDisplay: this.formatTimestampLagos(
          platformTx.settledAt ?? platformTx.createdAt,
        ),
        methodDisplay: this.formatMethod(channel, authorization),
        reference: platformTx.paymentReference,
        breakdown: {
          schoolFeesNaira: Money.fromNaira(platformTx.feeAmount).toNaira(),
          paystackFeeNaira: Money.fromNaira(platformTx.paystackFee).toNaira(),
          totalNaira: Money.fromNaira(platformTx.totalCharged).toNaira(),
        },
      },
      receiptDownloadUrl: platformTx.receiptUrl,
    };
  }

  private collectRecipients(
    context: NonNullable<Awaited<ReturnType<PaymentReceiptService['loadContext']>>>,
  ): { email: string; name: string }[] {
    const student = context.studentPayment.student;
    const out: { email: string; name: string }[] = [];

    if (student.user.email) {
      out.push({
        email: student.user.email,
        name: `${student.user.firstName} ${student.user.lastName}`,
      });
    }
    const guardianUser = student.guardian?.user;
    if (guardianUser?.email && guardianUser.email !== student.user.email) {
      out.push({
        email: guardianUser.email,
        name: `${guardianUser.firstName} ${guardianUser.lastName}`,
      });
    }
    return out;
  }

  /**
   * Fetch the school's logo and inline it as a base64 data URI so the email
   * client doesn't need network access to render it. Falls back to the default
   * SVG on any failure — fetch error, timeout, oversize, non-image, etc.
   */
  private async resolveLogoSrc(logoUrl: string | null): Promise<string> {
    if (!logoUrl) return DEFAULT_SCHOOL_LOGO_DATA_URI;

    const MAX_LOGO_BYTES = 500 * 1024;
    const TIMEOUT_MS = 4000;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(logoUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        this.logger.warn(`Logo fetch returned ${response.status} for ${logoUrl}`);
        return DEFAULT_SCHOOL_LOGO_DATA_URI;
      }

      const contentType = response.headers.get('content-type') ?? 'image/png';
      if (!contentType.startsWith('image/')) {
        this.logger.warn(`Logo at ${logoUrl} is not an image (${contentType})`);
        return DEFAULT_SCHOOL_LOGO_DATA_URI;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_LOGO_BYTES) {
        this.logger.warn(`Logo at ${logoUrl} exceeds ${MAX_LOGO_BYTES} bytes; using default`);
        return DEFAULT_SCHOOL_LOGO_DATA_URI;
      }

      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch logo from ${logoUrl}: ${(error as Error).message}; using default`,
      );
      return DEFAULT_SCHOOL_LOGO_DATA_URI;
    }
  }

  private extractAuthorization(payload: unknown): PaystackAuthorization | null {
    if (!payload || typeof payload !== 'object') return null;
    const data = (payload as { data?: { authorization?: PaystackAuthorization } }).data;
    return data?.authorization ?? null;
  }

  private extractChannel(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const data = (payload as { data?: { channel?: string } }).data;
    return data?.channel ?? null;
  }

  private formatMethod(channel: string | null, auth: PaystackAuthorization | null): string {
    if (!channel && !auth) return 'Online payment';
    const parts: string[] = [];
    if (channel) parts.push(this.capitalize(channel));
    if (auth?.brand && auth?.last4) {
      parts.push(`${this.capitalize(auth.brand)} ending ${auth.last4}`);
    }
    if (auth?.bank) parts.push(auth.bank);
    return parts.join(' · ') || 'Online payment';
  }

  private formatAddress(address: { street1?: string | null; city?: string | null; state?: string | null } | null | undefined): string | null {
    if (!address) return null;
    const parts = [address.street1, address.city, address.state].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }

  private formatTimestampLagos(date: Date | null | undefined): string {
    if (!date) return '—';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed
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

  private capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
  }

  private buildPlainText(data: ReceiptTemplateData): string {
    return [
      `Payment Receipt — ${data.school.name}`,
      ``,
      `Amount: ₦${formatNaira(data.transaction.breakdown.totalNaira)}`,
      `Status: ${data.payment.overallStatus}`,
      `Date: ${data.transaction.paidAtDisplay}`,
      `Reference: ${data.transaction.reference}`,
      `Method: ${data.transaction.methodDisplay}`,
      ``,
      `Paid for: ${data.student.fullName} (Student #${data.student.studentNo})`,
      `Payment: ${data.payment.structureName}`,
      data.payment.sessionName ? `Session: ${data.payment.sessionName}${data.payment.termName ? ` · ${data.payment.termName}` : ''}` : null,
      ``,
      `-- THIS TRANSACTION --`,
      `School fees portion:    ₦${formatNaira(data.transaction.breakdown.schoolFeesNaira)}`,
      `Payment gateway fee:    ₦${formatNaira(data.transaction.breakdown.paystackFeeNaira)}`,
      `Total paid now:         ₦${formatNaira(data.transaction.breakdown.totalNaira)}`,
      ``,
      `-- PAYMENT PROGRESS --`,
      `Total fee:              ₦${formatNaira(data.payment.totalFeeNaira)}`,
      data.payment.previouslyPaidNaira > 0
        ? `Previously paid:        ₦${formatNaira(data.payment.previouslyPaidNaira)}`
        : null,
      `Paid to date:           ₦${formatNaira(data.payment.paidToDateNaira)}`,
      `Outstanding balance:    ₦${formatNaira(data.payment.outstandingNaira)}`,
      ``,
      data.payment.overallStatus === PaymentStatus.PAID
        ? 'This fee is now fully settled.'
        : `Outstanding balance on this fee: ₦${formatNaira(data.payment.outstandingNaira)}`,
      ``,
      'Powered by Schos. Keep this receipt for your records.',
    ]
      .filter((line) => line !== null)
      .join('\n');
  }
}

function formatNaira(amount: number): string {
  return amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const DEFAULT_SCHOOL_LOGO_DATA_URI =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#4f46e5"/><text x="32" y="40" text-anchor="middle" font-family="system-ui" font-size="28" font-weight="700" fill="#fff">S</text></svg>`,
  ).toString('base64');
