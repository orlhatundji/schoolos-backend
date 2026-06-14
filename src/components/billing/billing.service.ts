import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PlatformTransactionOperation,
  Prisma,
  SchoolInvoice,
  SchoolInvoicePaidVia,
  SchoolInvoiceStatus,
  SchoolInvoiceType,
  TransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CurrentTermService } from '../../shared/services/current-term.service';
import { FeeCalculationService } from '../../shared/services/fee-calculation.service';
import { PdfService } from '../../shared/services/pdf.service';
import { MailQueueService } from '../../utils/mail-queue/mail-queue.service';
import { Money } from '../payments/domain/money';
import { PaymentEventOutcome } from '../payments/domain/payment-event-result';
import { PaymentService } from '../payments/payment.service';
import { PaystackApiClient } from '../payments/paystack/paystack-api.client';
import { InvoicePdfService } from './invoice-pdf.service';

export interface InvoiceGenerationReport {
  scanned: number;
  generated: number;
  generatedFree: number;
  skipped: {
    preSignupTerm: number;
    existing: number;
    noStudents: number;
    noCurrentTerm: number;
  };
}

export interface BillingStatusSummary {
  outstanding: {
    count: number;
    totalAmount: number;
    invoices: Array<{
      id: string;
      termName: string;
      sessionLabel: string;
      totalAmount: number;
      issuedAt: Date;
    }>;
  };
  currentTerm: {
    id: string;
    name: string;
    endDate: Date;
    daysUntilEnd: number;
  } | null;
}

const WELCOME_OFFER_REASON = 'First term free — welcome offer';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly currentTermService: CurrentTermService,
    private readonly feeCalculationService: FeeCalculationService,
    private readonly paystackApiClient: PaystackApiClient,
    private readonly paymentService: PaymentService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly pdfService: PdfService,
    private readonly mailQueueService: MailQueueService,
  ) {}

  // ────────────────── Invoice generation ──────────────────

  async generateInvoicesForTerm(termId: string): Promise<InvoiceGenerationReport> {
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException(`Term ${termId} not found`);

    const schools = await this.prisma.school.findMany({
      where: { deletedAt: null },
      select: { id: true, createdAt: true, serviceFeeOverride: true },
    });

    const report = this.emptyReport();
    report.scanned = schools.length;

    for (const school of schools) {
      await this.generateForOneSchool(school, term, report);
    }

    this.logger.log(`Generation for term ${termId}: ${JSON.stringify(report)}`);
    return report;
  }

  async generateForSchoolAndTerm(
    schoolId: string,
    termId: string,
  ): Promise<InvoiceGenerationReport> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, createdAt: true, serviceFeeOverride: true, deletedAt: true },
    });
    if (!school || school.deletedAt) throw new NotFoundException(`School ${schoolId} not found`);

    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException(`Term ${termId} not found`);

    const report = this.emptyReport();
    report.scanned = 1;
    await this.generateForOneSchool(school, term, report);
    this.logger.log(
      `Manual single-school generation school=${schoolId} term=${termId}: ${JSON.stringify(report)}`,
    );
    return report;
  }

  async listSchoolTerms(schoolId: string): Promise<
    Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      sessionLabel: string;
      isCurrent: boolean;
    }>
  > {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { currentTermId: true, deletedAt: true },
    });
    if (!school || school.deletedAt) throw new NotFoundException(`School ${schoolId} not found`);

    const terms = await this.prisma.term.findMany({
      where: {
        deletedAt: null,
        academicSession: { schoolId },
      },
      orderBy: { startDate: 'desc' },
      include: { academicSession: { select: { academicYear: true } } },
    });

    return terms.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      sessionLabel: `${t.academicSession.academicYear} · ${t.name}`,
      isCurrent: t.id === school.currentTermId,
    }));
  }

  async generateForCurrentTerms(): Promise<InvoiceGenerationReport> {
    const schools = await this.prisma.school.findMany({
      where: { deletedAt: null },
      select: { id: true, createdAt: true, serviceFeeOverride: true },
    });

    const report = this.emptyReport();
    report.scanned = schools.length;

    for (const school of schools) {
      const currentTermId = await this.currentTermService.getCurrentTermId(school.id);
      if (!currentTermId) {
        report.skipped.noCurrentTerm++;
        continue;
      }
      const term = await this.prisma.term.findUnique({ where: { id: currentTermId } });
      if (!term) {
        report.skipped.noCurrentTerm++;
        continue;
      }
      await this.generateForOneSchool(school, term, report);
    }

    this.logger.log(`Daily invoice generation: ${JSON.stringify(report)}`);
    return report;
  }

  private async generateForOneSchool(
    school: { id: string; createdAt: Date; serviceFeeOverride: Prisma.Decimal | null },
    term: { id: string; academicSessionId: string; endDate: Date; startDate: Date },
    report: InvoiceGenerationReport,
  ): Promise<void> {
    if (term.endDate < school.createdAt) {
      report.skipped.preSignupTerm++;
      return;
    }

    const existing = await this.prisma.schoolInvoice.findFirst({
      where: { schoolId: school.id, termId: term.id, type: SchoolInvoiceType.PLATFORM_SERVICE },
      select: { id: true },
    });
    if (existing) {
      report.skipped.existing++;
      return;
    }

    const studentCount = await this.countActiveStudents(school.id, term.academicSessionId);
    if (studentCount === 0) {
      report.skipped.noStudents++;
      return;
    }

    const hasAnyInvoice = await this.prisma.schoolInvoice.findFirst({
      where: { schoolId: school.id },
      select: { id: true },
    });

    if (!hasAnyInvoice) {
      const unitFee = this.resolveUnitFee(school.serviceFeeOverride);
      await this.prisma.schoolInvoice.create({
        data: {
          schoolId: school.id,
          termId: term.id,
          status: SchoolInvoiceStatus.WAIVED,
          studentCount,
          unitFee,
          totalAmount: 0,
          waivedAt: new Date(),
          waivedById: null,
          waiverReason: WELCOME_OFFER_REASON,
        },
      });
      report.generatedFree++;
      return;
    }

    const unitFee = this.resolveUnitFee(school.serviceFeeOverride);
    const totalAmount = unitFee * studentCount;

    const invoice = await this.prisma.schoolInvoice.create({
      data: {
        schoolId: school.id,
        termId: term.id,
        status: SchoolInvoiceStatus.ISSUED,
        studentCount,
        unitFee,
        totalAmount,
      },
    });
    report.generated++;

    try {
      const { pdf, html } = await this.invoicePdfService.generateAndArchive(invoice.id);
      await this.emailInvoiceToSchool(invoice.id, html, pdf);
    } catch (err) {
      this.logger.error(
        `Failed to PDF/email invoice ${invoice.id}: ${(err as Error).message}`,
      );
    }
  }

  private async emailInvoiceToSchool(
    invoiceId: string,
    invoiceHtml: string,
    pdf: Buffer,
  ): Promise<void> {
    const invoice = await this.invoicePdfService.loadInvoice(invoiceId);

    const admin = await this.prisma.user.findFirst({
      where: {
        schoolId: invoice.schoolId,
        deletedAt: null,
        type: { in: ['ADMIN', 'SUPER_ADMIN'] },
        email: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!admin?.email) {
      this.logger.warn(`No admin email for school ${invoice.schoolId}; skipping invoice email`);
      return;
    }

    const termLabel = `${invoice.term.academicSession.academicYear} · ${invoice.term.name}`;
    const totalNaira = `₦${Number(invoice.totalAmount).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const intro = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto 24px;">
        <p>Hi ${admin.firstName},</p>
        <p>A new Schos invoice is now available for <strong>${invoice.school.name}</strong> for <strong>${termLabel}</strong>.</p>
        <p>The total due is <strong>${totalNaira}</strong>. The invoice PDF is attached, and you can pay online from your admin portal under <strong>Invoices → Pay now</strong>.</p>
      </div>
    `;

    await this.mailQueueService.add({
      recipientAddress: admin.email,
      recipientName: `${admin.firstName} ${admin.lastName}`,
      subject: `New Schos invoice available · ${termLabel}`,
      html: intro + invoiceHtml,
      attachments: [
        {
          filename: `schos-invoice-${invoice.id.split('-')[0]}.pdf`,
          contentBase64: pdf.toString('base64'),
          contentType: 'application/pdf',
        },
      ],
    });
  }

  private async countActiveStudents(schoolId: string, academicSessionId: string): Promise<number> {
    return this.prisma.student.count({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        user: { schoolId },
        classArmStudents: {
          some: {
            isActive: true,
            deletedAt: null,
            classArm: { academicSessionId },
          },
        },
      },
    });
  }

  private resolveUnitFee(override: Prisma.Decimal | null): number {
    if (override !== null) return Number(override);
    return this.configService.get<number>('schos.serviceFeeNaira') ?? 500;
  }

  private emptyReport(): InvoiceGenerationReport {
    return {
      scanned: 0,
      generated: 0,
      generatedFree: 0,
      skipped: { preSignupTerm: 0, existing: 0, noStudents: 0, noCurrentTerm: 0 },
    };
  }

  // ────────────────── Status transitions (manual actor required) ──────────────────

  async markInvoicePaid(invoiceId: string, _actorUserId: string, note?: string): Promise<SchoolInvoice> {
    return this.transitionFromIssued(invoiceId, {
      status: SchoolInvoiceStatus.PAID,
      paidAt: new Date(),
      paidVia: SchoolInvoicePaidVia.EXTERNAL,
      paidNote: note ?? null,
    });
  }

  async waiveInvoice(invoiceId: string, actorUserId: string, reason: string): Promise<SchoolInvoice> {
    if (!reason?.trim()) throw new BadRequestException('Waive reason is required');
    return this.transitionFromIssued(invoiceId, {
      status: SchoolInvoiceStatus.WAIVED,
      waivedAt: new Date(),
      waivedById: actorUserId,
      waiverReason: reason.trim(),
    });
  }

  async cancelInvoice(invoiceId: string, actorUserId: string, reason: string): Promise<SchoolInvoice> {
    if (!reason?.trim()) throw new BadRequestException('Cancel reason is required');
    return this.transitionFromIssued(invoiceId, {
      status: SchoolInvoiceStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledById: actorUserId,
      cancelReason: reason.trim(),
    });
  }

  async unwaiveInvoice(invoiceId: string): Promise<SchoolInvoice> {
    const result = await this.prisma.schoolInvoice.updateMany({
      where: { id: invoiceId, status: SchoolInvoiceStatus.WAIVED },
      data: {
        status: SchoolInvoiceStatus.ISSUED,
        waivedAt: null,
        waivedById: null,
        waiverReason: null,
      },
    });
    if (result.count !== 1) {
      const exists = await this.prisma.schoolInvoice.findUnique({ where: { id: invoiceId } });
      if (!exists) throw new NotFoundException(`Invoice ${invoiceId} not found`);
      throw new ConflictException(
        `Invoice ${invoiceId} is not WAIVED (current: ${exists.status})`,
      );
    }
    return this.prisma.schoolInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
  }

  async getInvoiceReceiptUrl(invoiceId: string): Promise<{ url: string; reference: string }> {
    const tx = await this.prisma.platformTransaction.findFirst({
      where: {
        operationType: PlatformTransactionOperation.SCHOOL_INVOICE,
        operationId: invoiceId,
        status: TransactionStatus.SETTLED,
      },
      orderBy: { settledAt: 'desc' },
      select: { receiptUrl: true, paymentReference: true },
    });
    if (!tx) {
      throw new NotFoundException(`No settled payment found for invoice ${invoiceId}`);
    }
    if (!tx.receiptUrl) {
      throw new NotFoundException('Receipt is not yet ready');
    }
    return { url: tx.receiptUrl, reference: tx.paymentReference };
  }

  async editInvoice(
    invoiceId: string,
    actorUserId: string,
    input: { totalAmount?: number; studentCount?: number; unitFee?: number; reason: string },
  ): Promise<SchoolInvoice> {
    if (!input.reason?.trim()) throw new BadRequestException('Edit reason is required');

    const invoice = await this.prisma.schoolInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (invoice.status !== SchoolInvoiceStatus.ISSUED) {
      throw new ConflictException(
        `Invoice ${invoiceId} cannot be edited in status ${invoice.status}`,
      );
    }

    const pendingTx = await this.prisma.platformTransaction.findFirst({
      where: {
        operationType: PlatformTransactionOperation.SCHOOL_INVOICE,
        operationId: invoiceId,
        status: TransactionStatus.PENDING,
      },
      select: { id: true },
    });
    if (pendingTx) {
      throw new ConflictException(
        'Invoice has a pending Paystack transaction. Wait for it to settle or fail before editing.',
      );
    }

    const previousTotal = Number(invoice.totalAmount);
    const previousCount = invoice.studentCount;

    const updated = await this.prisma.schoolInvoice.update({
      where: { id: invoiceId },
      data: {
        totalAmount: input.totalAmount ?? invoice.totalAmount,
        studentCount: input.studentCount ?? invoice.studentCount,
        unitFee: input.unitFee ?? invoice.unitFee,
        editedAt: new Date(),
        editedById: actorUserId,
        editReason: input.reason.trim(),
      },
    });

    try {
      const { pdf } = await this.invoicePdfService.generateAndArchive(invoiceId);
      await this.emailCorrectedInvoice(invoiceId, pdf, {
        previousTotal,
        previousCount,
        newTotal: Number(updated.totalAmount),
        newCount: updated.studentCount,
        reason: input.reason.trim(),
      });
    } catch (err) {
      this.logger.error(
        `Failed to regenerate PDF / email corrected invoice ${invoiceId}: ${(err as Error).message}`,
      );
    }

    return updated;
  }

  private async emailCorrectedInvoice(
    invoiceId: string,
    pdf: Buffer,
    diff: {
      previousTotal: number;
      previousCount: number;
      newTotal: number;
      newCount: number;
      reason: string;
    },
  ): Promise<void> {
    const invoice = await this.invoicePdfService.loadInvoice(invoiceId);

    const admin = await this.prisma.user.findFirst({
      where: {
        schoolId: invoice.schoolId,
        deletedAt: null,
        type: { in: ['ADMIN', 'SUPER_ADMIN'] },
        email: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!admin?.email) return;

    const formatNaira = (n: number) =>
      `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const html = await this.pdfService.generateInvoiceCorrectedHtml({
      invoice: {
        reference: invoiceId.split('-')[0]?.toUpperCase() ?? invoiceId,
        termLabel: `${invoice.term.academicSession.academicYear} · ${invoice.term.name}`,
      },
      diff: {
        previousTotal: formatNaira(diff.previousTotal),
        newTotal: formatNaira(diff.newTotal),
        previousCount: diff.previousCount,
        newCount: diff.newCount,
        reason: diff.reason,
      },
    });

    await this.mailQueueService.add({
      recipientAddress: admin.email,
      recipientName: `${admin.firstName} ${admin.lastName}`,
      subject: `Corrected invoice · ${invoice.term.academicSession.academicYear} · ${invoice.term.name}`,
      html,
      attachments: [
        {
          filename: `schos-invoice-${invoiceId.split('-')[0]}.pdf`,
          contentBase64: pdf.toString('base64'),
          contentType: 'application/pdf',
        },
      ],
    });
  }

  private async transitionFromIssued(
    invoiceId: string,
    update: Prisma.SchoolInvoiceUncheckedUpdateManyInput,
  ): Promise<SchoolInvoice> {
    const result = await this.prisma.schoolInvoice.updateMany({
      where: { id: invoiceId, status: SchoolInvoiceStatus.ISSUED },
      data: update,
    });
    if (result.count !== 1) {
      const exists = await this.prisma.schoolInvoice.findUnique({ where: { id: invoiceId } });
      if (!exists) throw new NotFoundException(`Invoice ${invoiceId} not found`);
      throw new ConflictException(
        `Invoice ${invoiceId} is not in ISSUED status (current: ${exists.status})`,
      );
    }
    return this.prisma.schoolInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
  }

  // ────────────────── Read APIs ──────────────────

  async getInvoiceStats(): Promise<{
    collected: { count: number; totalAmount: number };
    outstanding: { count: number; totalAmount: number };
    waived: { count: number; faceValue: number };
    cancelled: { count: number };
    schoolsBilled: number;
  }> {
    const [grouped, schoolsBilled] = await Promise.all([
      this.prisma.schoolInvoice.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { totalAmount: true, studentCount: true },
      }),
      this.prisma.schoolInvoice.findMany({
        select: { schoolId: true },
        distinct: ['schoolId'],
      }),
    ]);

    const pick = (s: SchoolInvoiceStatus) => grouped.find((g) => g.status === s);
    const paid = pick(SchoolInvoiceStatus.PAID);
    const issued = pick(SchoolInvoiceStatus.ISSUED);
    const waived = pick(SchoolInvoiceStatus.WAIVED);
    const cancelled = pick(SchoolInvoiceStatus.CANCELLED);

    // WAIVED invoices have totalAmount = 0 (no revenue), but we surface their
    // would-be face value by re-multiplying snapshot studentCount × unitFee.
    // Approximate via a second query since groupBy doesn't expose unitFee × count.
    const waivedFaceValue = waived
      ? (
          await this.prisma.schoolInvoice.findMany({
            where: { status: SchoolInvoiceStatus.WAIVED },
            select: { studentCount: true, unitFee: true },
          })
        ).reduce((sum, r) => sum + r.studentCount * Number(r.unitFee), 0)
      : 0;

    return {
      collected: {
        count: paid?._count._all ?? 0,
        totalAmount: Number(paid?._sum.totalAmount ?? 0),
      },
      outstanding: {
        count: issued?._count._all ?? 0,
        totalAmount: Number(issued?._sum.totalAmount ?? 0),
      },
      waived: {
        count: waived?._count._all ?? 0,
        faceValue: waivedFaceValue,
      },
      cancelled: { count: cancelled?._count._all ?? 0 },
      schoolsBilled: schoolsBilled.length,
    };
  }

  async listInvoices(filters: {
    status?: SchoolInvoiceStatus;
    schoolId?: string;
    termId?: string;
  }) {
    return this.prisma.schoolInvoice.findMany({
      where: filters,
      orderBy: { issuedAt: 'desc' },
      take: 200,
      include: {
        school: { select: { id: true, name: true, code: true } },
        term: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            academicSession: { select: { id: true, academicYear: true } },
          },
        },
      },
    });
  }

  async getInvoiceById(invoiceId: string) {
    const invoice = await this.prisma.schoolInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        school: { select: { id: true, name: true, code: true, email: true } },
        term: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            academicSession: { select: { id: true, academicYear: true } },
          },
        },
        waivedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        cancelledBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        editedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    return invoice;
  }

  async getMyInvoices(schoolId: string) {
    return this.prisma.schoolInvoice.findMany({
      where: { schoolId },
      orderBy: { issuedAt: 'desc' },
      include: {
        term: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            academicSession: { select: { id: true, academicYear: true } },
          },
        },
      },
    });
  }

  async getOutstandingInvoices(schoolId: string): Promise<SchoolInvoice[]> {
    return this.prisma.schoolInvoice.findMany({
      where: { schoolId, status: SchoolInvoiceStatus.ISSUED },
      orderBy: { issuedAt: 'asc' },
    });
  }

  async hasOutstandingInvoices(schoolId: string): Promise<boolean> {
    const row = await this.prisma.schoolInvoice.findFirst({
      where: { schoolId, status: SchoolInvoiceStatus.ISSUED },
      select: { id: true },
    });
    return Boolean(row);
  }

  async getMyBillingStatus(schoolId: string): Promise<BillingStatusSummary> {
    const outstanding = await this.prisma.schoolInvoice.findMany({
      where: { schoolId, status: SchoolInvoiceStatus.ISSUED },
      orderBy: { issuedAt: 'asc' },
      include: { term: { include: { academicSession: true } } },
    });

    const outstandingTotal = outstanding.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );

    const current = await this.currentTermService.getCurrentTermWithSession(schoolId);
    const currentTerm = current
      ? {
          id: current.term.id,
          name: current.term.name,
          endDate: current.term.endDate,
          daysUntilEnd: this.daysUntilEndOfDay(current.term.endDate),
        }
      : null;

    return {
      outstanding: {
        count: outstanding.length,
        totalAmount: outstandingTotal,
        invoices: outstanding.map((inv) => ({
          id: inv.id,
          termName: inv.term.name,
          sessionLabel: `${inv.term.academicSession.academicYear} · ${inv.term.name}`,
          totalAmount: Number(inv.totalAmount),
          issuedAt: inv.issuedAt,
        })),
      },
      currentTerm,
    };
  }

  private daysUntilEndOfDay(endDate: Date): number {
    const now = new Date();
    const millis = endDate.getTime() - now.getTime();
    return Math.ceil(millis / (1000 * 60 * 60 * 24));
  }

  // ────────────────── Ownership / authorization ──────────────────

  async requireInvoiceOwnedBySchool(invoiceId: string, schoolId: string): Promise<SchoolInvoice> {
    const invoice = await this.prisma.schoolInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (invoice.schoolId !== schoolId) {
      throw new ForbiddenException('Invoice does not belong to your school');
    }
    return invoice;
  }

  async getMyInvoiceById(schoolId: string, invoiceId: string) {
    await this.requireInvoiceOwnedBySchool(invoiceId, schoolId);
    return this.prisma.schoolInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        term: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            academicSession: { select: { id: true, academicYear: true } },
          },
        },
      },
    });
  }

  // ────────────────── Online payment (Paystack) ──────────────────

  async initiateInvoicePayment(
    userId: string,
    schoolId: string,
    invoiceId: string,
  ): Promise<{
    authorizationUrl: string;
    reference: string;
    amountDue: number;
  }> {
    const invoice = await this.requireInvoiceOwnedBySchool(invoiceId, schoolId);
    if (invoice.status !== SchoolInvoiceStatus.ISSUED) {
      throw new ConflictException(
        `Invoice is in status ${invoice.status}; only ISSUED invoices can be paid`,
      );
    }

    const totalCharged = Number(invoice.totalAmount);
    const breakdown = this.feeCalculationService.calculatePaystackBreakdownInclusive(totalCharged);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) {
      throw new BadRequestException('Caller must have an email on file to initiate payment');
    }

    const reference = this.paystackApiClient.generateReference('SCH_PAY');

    // Paystack appends `?reference=<ref>&trxref=<ref>` to the callback URL on
    // redirect, so we send the bare path — adding our own `?reference=` causes
    // duplicate query params in the final URL.
    const adminAppBaseUrl = this.configService.get<string>('adminAppBaseUrl');
    const callbackUrl = adminAppBaseUrl
      ? `${adminAppBaseUrl.replace(/\/$/, '')}/invoices/verify`
      : undefined;

    const paystackResponse = await this.paystackApiClient.initializePayment({
      amount: this.paystackApiClient.convertToKobo(totalCharged),
      email: user.email,
      reference,
      callback_url: callbackUrl,
      metadata: {
        invoiceId: invoice.id,
        schoolId: invoice.schoolId,
        termId: invoice.termId,
        paidByUserId: userId,
      },
    });

    this.logger.log(
      `initiateInvoicePayment: invoice=${invoice.id} school=${invoice.schoolId} user=${userId} reference=${reference} amount=${totalCharged} callbackUrl=${callbackUrl ?? '(none — falling back to Paystack dashboard default)'} authorizationUrl=${paystackResponse.data.authorization_url}`,
    );

    await this.prisma.platformTransaction.create({
      data: {
        schoolId: invoice.schoolId,
        operationType: PlatformTransactionOperation.SCHOOL_INVOICE,
        operationId: invoice.id,
        paymentReference: reference,
        totalCharged,
        paystackFee: breakdown.paystackFee,
        feeAmount: breakdown.recipientReceives,
        status: TransactionStatus.PENDING,
      },
    });

    return {
      authorizationUrl: paystackResponse.data.authorization_url,
      reference,
      amountDue: totalCharged,
    };
  }

  async verifyInvoicePaymentByReference(
    schoolId: string,
    reference: string,
  ): Promise<{
    invoice: Awaited<ReturnType<typeof this.getMyInvoiceById>>;
    alreadyProcessed: boolean;
    paidAt: Date | null;
    receiptUrl: string | null;
  }> {
    const result = await this.paymentService.adminVerifyPaymentByReference(schoolId, reference);
    if (
      result.outcome !== PaymentEventOutcome.PAYMENT_PROCESSED &&
      result.outcome !== PaymentEventOutcome.DUPLICATE_EVENT
    ) {
      throw new BadRequestException(`Verification outcome: ${result.outcome}`);
    }

    const platformTx = await this.prisma.platformTransaction.findUnique({
      where: { paymentReference: reference },
      select: { operationType: true, operationId: true, settledAt: true, receiptUrl: true },
    });
    if (!platformTx || platformTx.operationType !== PlatformTransactionOperation.SCHOOL_INVOICE) {
      throw new NotFoundException('No invoice payment matches this reference');
    }

    const invoice = await this.getMyInvoiceById(schoolId, platformTx.operationId);
    return {
      invoice,
      alreadyProcessed: result.outcome === PaymentEventOutcome.DUPLICATE_EVENT,
      paidAt: platformTx.settledAt,
      receiptUrl: platformTx.receiptUrl,
    };
  }

  async verifyInvoicePayment(
    schoolId: string,
    invoiceId: string,
    reference: string,
  ): Promise<{ status: SchoolInvoiceStatus; settledAt: Date | null }> {
    const invoice = await this.requireInvoiceOwnedBySchool(invoiceId, schoolId);
    const platformTx = await this.prisma.platformTransaction.findUnique({
      where: { paymentReference: reference },
      select: { operationType: true, operationId: true, status: true, settledAt: true },
    });
    if (
      !platformTx ||
      platformTx.operationType !== PlatformTransactionOperation.SCHOOL_INVOICE ||
      platformTx.operationId !== invoice.id
    ) {
      throw new NotFoundException('Transaction not found for this invoice');
    }

    const refreshed = await this.prisma.schoolInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
    return { status: refreshed.status, settledAt: platformTx.settledAt };
  }

  // ────────────────── PDF download ──────────────────

  async getInvoicePdfUrl(invoiceId: string): Promise<string> {
    const invoice = await this.prisma.schoolInvoice.findUnique({
      where: { id: invoiceId },
      select: { pdfUrl: true },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (!invoice.pdfUrl) {
      throw new NotFoundException('Invoice PDF has not been generated yet');
    }
    return invoice.pdfUrl;
  }

  // Money helper proxy so callers don't import the domain object directly.
  toKobo(naira: number): number {
    return Money.fromNaira(naira).toKobo();
  }
}
