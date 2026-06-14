import { Injectable, Logger } from '@nestjs/common';
import { SchoolInvoice } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../../shared/services/pdf.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
  ) {}

  async generateAndArchive(invoiceId: string): Promise<{ pdf: Buffer; publicUrl: string; html: string }> {
    const invoice = await this.loadInvoice(invoiceId);

    const templateData = this.buildTemplateData(invoice);
    const pdf = await this.pdfService.generateInvoicePDF(templateData);
    const html = this.pdfService.renderInvoiceHtml(templateData);

    const key = `schos/invoices/${invoice.schoolId}/${invoice.id}.pdf`;
    const { publicUrl } = await this.storageService.uploadBuffer(
      'invoices',
      'application/pdf',
      pdf,
      key,
    );

    await this.prisma.schoolInvoice.update({
      where: { id: invoice.id },
      data: { pdfUrl: publicUrl },
    });

    return { pdf, publicUrl, html };
  }

  async loadInvoice(invoiceId: string): Promise<InvoiceWithRelations> {
    const row = await this.prisma.schoolInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        school: { include: { primaryAddress: true } },
        term: { include: { academicSession: true } },
      },
    });
    return row as unknown as InvoiceWithRelations;
  }

  private buildTemplateData(invoice: InvoiceWithRelations) {
    const totalDisplay = formatNaira(Number(invoice.totalAmount));
    const unitFeeDisplay = formatNaira(Number(invoice.unitFee));
    const issuedAtDisplay = formatLagosDate(invoice.issuedAt);
    const termLabel = `${invoice.term.academicSession.academicYear} · ${invoice.term.name}`;

    return {
      school: {
        name: invoice.school.name,
        email: invoice.school.email,
        addressLine: invoice.school.primaryAddress
          ? [
              invoice.school.primaryAddress.street1,
              invoice.school.primaryAddress.city,
              invoice.school.primaryAddress.state,
            ]
              .filter(Boolean)
              .join(', ')
          : null,
      },
      invoice: {
        reference: shortId(invoice.id),
        issuedAtDisplay,
        termLabel,
        studentCount: invoice.studentCount,
        unitFeeDisplay,
        totalDisplay,
      },
    };
  }
}

type InvoiceWithRelations = SchoolInvoice & {
  school: {
    name: string;
    email: string | null;
    primaryAddress: { street1: string; city: string; state: string } | null;
  };
  term: { name: string; academicSession: { academicYear: string } };
};

function formatNaira(value: number): string {
  return `₦${value.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatLagosDate(date: Date): string {
  return date
    .toLocaleString('en-NG', {
      timeZone: 'Africa/Lagos',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
}

function shortId(id: string): string {
  return id.split('-')[0]?.toUpperCase() ?? id;
}
