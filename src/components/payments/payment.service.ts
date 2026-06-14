import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PaymentStatus,
  PaystackEventStatus,
  PlatformTransactionOperation,
  Prisma,
  SchoolInvoicePaidVia,
  SchoolInvoiceStatus,
  TransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { FeeCalculationService } from '../../shared/services/fee-calculation.service';
import { ConfigService } from '@nestjs/config';
import { Money } from './domain/money';
import {
  PAYMENT_COMPLETED,
  PAYMENT_FAILED,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  SCHOOL_INVOICE_PAID,
  SchoolInvoicePaidEvent,
  TRANSFER_COMPLETED,
  TRANSFER_FAILED,
  TransferCompletedEvent,
  TransferFailedEvent,
} from './domain/events/payment-events';
import { assertCanTransition, nextStatusForCredit } from './domain/payment-status.machine';
import {
  IgnoreReason,
  PaymentEventOutcome,
  PaymentTarget,
} from './domain/payment-event-result';
import { PaystackApiClient } from './paystack/paystack-api.client';
import { PaystackEventType } from './paystack/paystack-event.constants';
import { PaystackEventRepository } from './paystack/paystack-event.repository';

export interface PaystackChargeData {
  id: number | bigint;
  reference: string;
  amount: number;
  status: string;
  gateway_response?: string;
}

export interface PaystackTransferData {
  id: number | bigint;
  reference: string;
  amount: number;
  reason?: string;
  recipient?: {
    details?: { account_number?: string; bank_code?: string };
    metadata?: Record<string, unknown>;
  };
  subaccount?: { subaccount_code?: string };
}

export type PaymentEventResult =
  | {
      outcome: PaymentEventOutcome.PAYMENT_PROCESSED;
      target: PaymentTarget.STUDENT_PAYMENT;
      studentPaymentId: string;
      status: PaymentStatus;
      amountNaira: number;
    }
  | {
      outcome: PaymentEventOutcome.PAYMENT_PROCESSED;
      target: PaymentTarget.SCHOOL_INVOICE;
      invoiceId: string;
      schoolId: string;
      termId: string;
      amountNaira: number;
    }
  | {
      outcome: PaymentEventOutcome.PAYMENT_FAILURE_RECORDED;
      studentPaymentId: string | null;
    }
  | {
      outcome: PaymentEventOutcome.TRANSFER_RECORDED;
      reference: string;
      amountNaira: number;
    }
  | {
      outcome: PaymentEventOutcome.TRANSFER_FAILURE_RECORDED;
      reference: string;
      amountNaira: number;
    }
  | { outcome: PaymentEventOutcome.DUPLICATE_EVENT }
  | { outcome: PaymentEventOutcome.IGNORED; reason: IgnoreReason };

export interface InitializeStudentPaymentInput {
  userId: string;
  paymentId: string;
  amount?: number;
}

export interface InitializeStudentPaymentResult {
  authorization_url: string;
  access_code: string;
  reference: string;
  feeBreakdown: {
    feeAmount: number;
    paystackFee: number;
    totalCharged: number;
    schoolReceives: number;
  };
  bankAccountMissing: boolean;
}

export interface InitializeColorSchemePaymentInput {
  customPrimaryColor: string;
  customSecondaryColor: string;
  customAccentColor: string;
}

export interface InitializeColorSchemePaymentResult {
  paymentId: string;
  paymentReference: string;
  amount: number;
  currency: string;
  expiresAt: Date | null;
  authorizationUrl: string | null;
}

const COLOR_SCHEME_PRICE_NAIRA = 500;
const COLOR_SCHEME_VALIDITY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackApiClient: PaystackApiClient,
    private readonly paystackEventRepository: PaystackEventRepository,
    private readonly feeCalculationService: FeeCalculationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  // ───────────────────────────── Webhook internal methods ─────────────────────────────
  async handleChargeSuccess(data: PaystackChargeData, rawPayload: Prisma.InputJsonValue): Promise<PaymentEventResult> {
    const result = await this.prisma.$transaction((tx) =>
      this.processChargeSuccessInTransaction(tx, data, rawPayload),
    );

    await this.emitForProcessedResult(result, data.reference);
    return result;
  }

  async handleChargeFailed(data: PaystackChargeData, rawPayload: Prisma.InputJsonValue): Promise<PaymentEventResult> {
    const result = await this.prisma.$transaction((tx) =>
      this.processChargeFailedInTransaction(tx, data, rawPayload),
    );

    await this.emitForFailedResult(result, data);
    return result;
  }

  async handleTransferSuccess(data: PaystackTransferData, rawPayload: Prisma.InputJsonValue): Promise<PaymentEventResult> {
    return this.handleTransferEvent(data, rawPayload, true);
  }

  async handleTransferFailed(data: PaystackTransferData, rawPayload: Prisma.InputJsonValue): Promise<PaymentEventResult> {
    return this.handleTransferEvent(data, rawPayload, false);
  }


  // ──────────────────────── Client init/verify methods ────────────────────────
  async initializeStudentPayment(input: InitializeStudentPaymentInput): Promise<InitializeStudentPaymentResult> {
    const student = await this.prisma.student.findFirst({
      where: { userId: input.userId, deletedAt: null },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const payment = await this.prisma.studentPayment.findFirst({
      where: {
        id: input.paymentId,
        studentId: student.id,
        deletedAt: null,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] },
      },
    });
    if (!payment) {
      throw new NotFoundException('StudentPayment not found or not available for payment');
    }

    const feeAmount = input.amount ?? Number(payment.amount) - Number(payment.paidAmount);
    if (feeAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const bankAccount = await this.prisma.schoolBankAccount.findUnique({
      where: { schoolId: student.user.schoolId },
    });
    const bankAccountMissing = !bankAccount?.paystackSubaccountCode;

    const breakdown = this.feeCalculationService.calculatePaystackBreakdownAdditive(feeAmount);
    const reference = this.paystackApiClient.generateReference('STU_PAY');

    const studentAppBaseUrl = this.configService.get<string>('studentAppBaseUrl');
    const paystackRequest: Parameters<PaystackApiClient['initializePayment']>[0] = {
      amount: this.paystackApiClient.convertToKobo(breakdown.totalCharged),
      email: student.user.email || `${student.studentNo}@school.com`,
      reference,
      callback_url: studentAppBaseUrl
        ? `${studentAppBaseUrl.replace(/\/$/, '')}/payments/verify?reference=${reference}`
        : undefined,
      metadata: {
        studentId: student.id,
        paymentId: payment.id,
        studentNo: student.studentNo,
        paymentStructureId: payment.paymentStructureId,
        feeAmount,
        paystackFee: breakdown.paystackFee,
        totalCharged: breakdown.totalCharged,
      },
    };
    if (!bankAccountMissing && bankAccount?.paystackSubaccountCode) {
      paystackRequest.subaccount = bankAccount.paystackSubaccountCode;
    }

    const paystackResponse = await this.paystackApiClient.initializePayment(paystackRequest);

    await this.prisma.$transaction([
      this.prisma.studentPayment.update({
        where: { id: payment.id },
        data: { notes: `Payment initiated with reference: ${reference}` },
      }),
      this.prisma.platformTransaction.create({
        data: {
          schoolId: student.user.schoolId,
          operationType: PlatformTransactionOperation.STUDENT_PAYMENT,
          operationId: payment.id,
          paymentReference: reference,
          totalCharged: breakdown.totalCharged,
          feeAmount,
          paystackFee: breakdown.paystackFee,
          status: TransactionStatus.PENDING,
        },
      }),
    ]);

    return {
      authorization_url: paystackResponse.data.authorization_url,
      access_code: paystackResponse.data.access_code,
      reference: paystackResponse.data.reference,
      feeBreakdown: {
        feeAmount,
        paystackFee: breakdown.paystackFee,
        totalCharged: breakdown.totalCharged,
        schoolReceives: feeAmount,
      },
      bankAccountMissing,
    };
  }

  async verifyStudentPayment(userId: string, reference: string): Promise<PaymentEventResult> {
    const platformTx = await this.prisma.platformTransaction.findUnique({
      where: { paymentReference: reference },
      select: { operationType: true, operationId: true },
    });
    if (!platformTx || platformTx.operationType !== PlatformTransactionOperation.STUDENT_PAYMENT) {
      return { outcome: PaymentEventOutcome.IGNORED, reason: IgnoreReason.NO_MATCHING_PAYMENT };
    }

    const studentOwns = await this.prisma.studentPayment.findFirst({
      where: {
        id: platformTx.operationId,
        student: { userId },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!studentOwns) {
      throw new NotFoundException('Payment record not found');
    }

    return this.verifyAndRecord(reference);
  }

  async adminVerifyPaymentByReference(
    schoolId: string,
    reference: string,
  ): Promise<PaymentEventResult> {
    const platformTx = await this.prisma.platformTransaction.findUnique({
      where: { paymentReference: reference },
      select: { schoolId: true },
    });
    if (!platformTx || platformTx.schoolId !== schoolId) {
      throw new NotFoundException(
        `No payment record found for reference "${reference}" in your school`,
      );
    }

    return this.verifyAndRecord(reference);
  }

  /** Platform-admin manual verification. No per-school auth check — caller must be a system admin. */
  async platformVerifyByReference(reference: string): Promise<PaymentEventResult> {
    const platformTx = await this.prisma.platformTransaction.findUnique({
      where: { paymentReference: reference },
      select: { id: true },
    });
    if (!platformTx) {
      throw new NotFoundException(`No transaction found for reference "${reference}"`);
    }
    return this.verifyAndRecord(reference);
  }

  async initializeColorSchemePayment(
    userId: string,
    colorData: InitializeColorSchemePaymentInput,
  ): Promise<InitializeColorSchemePaymentResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const validPaidPayment = await this.prisma.colorSchemePayment.findFirst({
      where: { userId, status: PaymentStatus.PAID, expiresAt: { gt: new Date() } },
    });
    if (validPaidPayment) {
      throw new ConflictException(
        'You already have an active custom color scheme subscription',
      );
    }

    const existingPending = await this.prisma.colorSchemePayment.findFirst({
      where: { userId, status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (existingPending) {
      await this.prisma.colorSchemePayment.update({
        where: { id: existingPending.id },
        data: { status: PaymentStatus.EXPIRED },
      });
    }

    const paymentReference = this.paystackApiClient.generateReference('CS_PAY');

    const paystackResponse = await this.paystackApiClient.initializePayment({
      amount: this.paystackApiClient.convertToKobo(COLOR_SCHEME_PRICE_NAIRA),
      email: user.email,
      reference: paymentReference,
      metadata: {
        userId,
        paymentType: 'COLOR_SCHEME',
        customPrimaryColor: colorData.customPrimaryColor,
        customSecondaryColor: colorData.customSecondaryColor,
        customAccentColor: colorData.customAccentColor,
      },
    });

    const payment = await this.prisma.colorSchemePayment.create({
      data: {
        userId,
        amount: COLOR_SCHEME_PRICE_NAIRA,
        currency: 'NGN',
        status: PaymentStatus.PENDING,
        paymentReference,
        authorizationUrl: paystackResponse.data.authorization_url,
        expiresAt: new Date(Date.now() + COLOR_SCHEME_VALIDITY_MS),
      },
    });

    return {
      paymentId: payment.id,
      paymentReference,
      amount: COLOR_SCHEME_PRICE_NAIRA,
      currency: 'NGN',
      expiresAt: payment.expiresAt,
      authorizationUrl: payment.authorizationUrl,
    };
  }

  // ───────────────────────── Bank / subaccount setup ─────────────────────────

  listSupportedBanks() {
    return this.paystackApiClient.listBanks();
  }

  resolveBankAccount(accountNumber: string, bankCode: string) {
    return this.paystackApiClient.resolveAccountNumber(accountNumber, bankCode);
  }

  createSchoolSubaccount(
    businessName: string,
    bankCode: string,
    accountNumber: string,
    percentageCharge: number = 0,
    contactInfo?: { email: string; name?: string; phone?: string },
  ) {
    return this.paystackApiClient.createSubaccount(
      businessName,
      bankCode,
      accountNumber,
      percentageCharge,
      contactInfo,
    );
  }

  updateSchoolSubaccount(
    subaccountCode: string,
    data: { business_name?: string; settlement_bank?: string; account_number?: string },
  ) {
    return this.paystackApiClient.updateSubaccount(subaccountCode, data);
  }

  // ───────────────────────────── Private internals ─────────────────────────────

  private async verifyAndRecord(reference: string): Promise<PaymentEventResult> {
    const paystackResponse = await this.paystackApiClient.verifyPayment(reference);
    if (paystackResponse.data.status !== 'success') {
      throw new BadRequestException(
        `Payment not successful on Paystack. Status: ${paystackResponse.data.status}`,
      );
    }
    return this.handleChargeSuccess(
      {
        id: paystackResponse.data.id,
        reference: paystackResponse.data.reference,
        amount: paystackResponse.data.amount,
        status: paystackResponse.data.status,
      },
      paystackResponse.data as unknown as Prisma.InputJsonValue,
    );
  }

  private async processChargeSuccessInTransaction(
    tx: Prisma.TransactionClient,
    data: PaystackChargeData,
    rawPayload: Prisma.InputJsonValue,
  ): Promise<PaymentEventResult> {
    const inserted = await this.paystackEventRepository.tryCreate(tx, {
      paystackEventId: data.id,
      eventType: PaystackEventType.CHARGE_SUCCESS,
      reference: data.reference,
      payload: rawPayload,
    });
    if (!inserted) {
      this.logger.log(`Duplicate Paystack event ${data.id}; already processed`);
      return { outcome: PaymentEventOutcome.DUPLICATE_EVENT };
    }

    const platformTx = await tx.platformTransaction.findUnique({
      where: { paymentReference: data.reference },
    });
    if (platformTx) {
      if (platformTx.operationType === PlatformTransactionOperation.STUDENT_PAYMENT) {
        return this.processAgainstStudentPayment(tx, data, platformTx);
      }
      if (platformTx.operationType === PlatformTransactionOperation.SCHOOL_INVOICE) {
        return this.processAgainstSchoolInvoice(tx, data, platformTx);
      }
    }

    await this.paystackEventRepository.markFinal(
      tx,
      data.id,
      PaystackEventStatus.IGNORED,
      `No matching payment for reference ${data.reference}`,
    );
    return { outcome: PaymentEventOutcome.IGNORED, reason: IgnoreReason.NO_MATCHING_PAYMENT };
  }

  private async processAgainstSchoolInvoice(
    tx: Prisma.TransactionClient,
    data: PaystackChargeData,
    platformTx: {
      id: string;
      totalCharged: Prisma.Decimal;
      operationId: string;
      schoolId: string;
    },
  ): Promise<PaymentEventResult> {
    const expectedKobo = Money.fromNaira(platformTx.totalCharged).toKobo();
    if (data.amount !== expectedKobo) {
      await this.paystackEventRepository.markFinal(
        tx,
        data.id,
        PaystackEventStatus.FAILED,
        `Amount mismatch on invoice charge: got ${data.amount} kobo, expected ${expectedKobo}`,
      );
      throw new BadRequestException('Webhook amount does not match invoice transaction');
    }

    const invoice = await tx.schoolInvoice.findUnique({ where: { id: platformTx.operationId } });
    if (!invoice) {
      await this.paystackEventRepository.markFinal(
        tx,
        data.id,
        PaystackEventStatus.FAILED,
        `Invoice ${platformTx.operationId} not found`,
      );
      throw new ConflictException('Invoice not found for charge');
    }

    if (invoice.status !== SchoolInvoiceStatus.ISSUED) {
      this.logger.warn(
        `Invoice ${invoice.id} already in status ${invoice.status}; marking platform tx settled idempotently`,
      );
      await tx.platformTransaction.update({
        where: { id: platformTx.id },
        data: { status: TransactionStatus.SETTLED, settledAt: new Date() },
      });
      await this.paystackEventRepository.markProcessed(tx, data.id);
      return { outcome: PaymentEventOutcome.DUPLICATE_EVENT };
    }

    const updated = await tx.schoolInvoice.updateMany({
      where: { id: invoice.id, status: SchoolInvoiceStatus.ISSUED },
      data: { status: SchoolInvoiceStatus.PAID, paidAt: new Date(), paidVia: SchoolInvoicePaidVia.ONLINE },
    });
    if (updated.count !== 1) {
      throw new ConflictException(`Invoice ${invoice.id} was modified concurrently`);
    }

    await tx.platformTransaction.update({
      where: { id: platformTx.id },
      data: { status: TransactionStatus.SETTLED, settledAt: new Date() },
    });

    await this.paystackEventRepository.markProcessed(tx, data.id);

    return {
      outcome: PaymentEventOutcome.PAYMENT_PROCESSED,
      target: PaymentTarget.SCHOOL_INVOICE,
      invoiceId: invoice.id,
      schoolId: invoice.schoolId,
      termId: invoice.termId,
      amountNaira: Number(invoice.totalAmount),
    };
  }

  private async processAgainstStudentPayment(
    tx: Prisma.TransactionClient,
    data: PaystackChargeData,
    platformTx: {
      id: string;
      totalCharged: Prisma.Decimal;
      feeAmount: Prisma.Decimal;
      operationType: PlatformTransactionOperation;
      operationId: string;
    },
  ): Promise<PaymentEventResult> {
    if (platformTx.operationType !== PlatformTransactionOperation.STUDENT_PAYMENT) {
      throw new ConflictException(
        `processAgainstStudentPayment called with unsupported operationType ${platformTx.operationType}`,
      );
    }

    const expectedKobo = Money.fromNaira(platformTx.totalCharged).toKobo();
    if (data.amount !== expectedKobo) {
      await this.paystackEventRepository.markFinal(
        tx,
        data.id,
        PaystackEventStatus.FAILED,
        `Amount mismatch: got ${data.amount} kobo, expected ${expectedKobo} kobo`,
      );
      throw new BadRequestException('Webhook amount does not match initiated transaction');
    }

    const studentPayment = await tx.studentPayment.findUniqueOrThrow({
      where: { id: platformTx.operationId },
    });

    if (studentPayment.status === PaymentStatus.WAIVED) {
      await this.paystackEventRepository.markFinal(
        tx,
        data.id,
        PaystackEventStatus.IGNORED,
        `StudentPayment ${studentPayment.id} is WAIVED`,
      );
      return { outcome: PaymentEventOutcome.IGNORED, reason: IgnoreReason.PAYMENT_WAIVED };
    }

    const credit = Money.fromNaira(platformTx.feeAmount);
    const newPaid = Money.fromNaira(studentPayment.paidAmount).add(credit);
    const total = Money.fromNaira(studentPayment.amount);
    const newStatus = nextStatusForCredit(studentPayment.status, newPaid, total);
    assertCanTransition(studentPayment.status, newStatus);

    const updateResult = await tx.studentPayment.updateMany({
      where: { id: studentPayment.id, status: studentPayment.status },
      data: {
        paidAmount: newPaid.toDecimal(),
        status: newStatus,
        paidAt: newStatus === PaymentStatus.PAID ? new Date() : studentPayment.paidAt,
      },
    });
    if (updateResult.count !== 1) {
      throw new ConflictException(
        `StudentPayment ${studentPayment.id} was modified concurrently`,
      );
    }

    await tx.platformTransaction.update({
      where: { id: platformTx.id },
      data: { status: TransactionStatus.SETTLED, settledAt: new Date() },
    });

    await this.paystackEventRepository.markProcessed(tx, data.id);

    return {
      outcome: PaymentEventOutcome.PAYMENT_PROCESSED,
      target: PaymentTarget.STUDENT_PAYMENT,
      studentPaymentId: studentPayment.id,
      status: newStatus,
      amountNaira: credit.toNaira(),
    };
  }

  private async processChargeFailedInTransaction(
    tx: Prisma.TransactionClient,
    data: PaystackChargeData,
    rawPayload: Prisma.InputJsonValue,
  ): Promise<PaymentEventResult> {
    const inserted = await this.paystackEventRepository.tryCreate(tx, {
      paystackEventId: data.id,
      eventType: PaystackEventType.CHARGE_FAILED,
      reference: data.reference,
      payload: rawPayload,
    });
    if (!inserted) {
      return { outcome: PaymentEventOutcome.DUPLICATE_EVENT };
    }

    const platformTx = await tx.platformTransaction.findUnique({
      where: { paymentReference: data.reference },
    });
    if (platformTx) {
      if (platformTx.status === TransactionStatus.PENDING) {
        await tx.platformTransaction.update({
          where: { id: platformTx.id },
          data: { status: TransactionStatus.FAILED },
        });
      }
      await this.paystackEventRepository.markProcessed(tx, data.id);
      return {
        outcome: PaymentEventOutcome.PAYMENT_FAILURE_RECORDED,
        studentPaymentId:
          platformTx.operationType === PlatformTransactionOperation.STUDENT_PAYMENT
            ? platformTx.operationId
            : null,
      };
    }

    await this.paystackEventRepository.markFinal(
      tx,
      data.id,
      PaystackEventStatus.IGNORED,
      `No matching payment for failed reference ${data.reference}`,
    );
    return { outcome: PaymentEventOutcome.IGNORED, reason: IgnoreReason.NO_MATCHING_PAYMENT };
  }

  private async handleTransferEvent(
    data: PaystackTransferData,
    rawPayload: Prisma.InputJsonValue,
    succeeded: boolean,
  ): Promise<PaymentEventResult> {
    const eventType: PaystackEventType = succeeded
      ? PaystackEventType.TRANSFER_SUCCESS
      : PaystackEventType.TRANSFER_FAILED;

    const result: PaymentEventResult = await this.prisma.$transaction(
      async (tx): Promise<PaymentEventResult> => {
        const inserted = await this.paystackEventRepository.tryCreate(tx, {
          paystackEventId: data.id,
          eventType,
          reference: data.reference,
          payload: rawPayload,
        });
        if (!inserted) {
          return { outcome: PaymentEventOutcome.DUPLICATE_EVENT };
        }
        await this.paystackEventRepository.markProcessed(tx, data.id);
        return {
          outcome: succeeded
            ? PaymentEventOutcome.TRANSFER_RECORDED
            : PaymentEventOutcome.TRANSFER_FAILURE_RECORDED,
          reference: data.reference,
          amountNaira: this.paystackApiClient.convertFromKobo(data.amount),
        };
      },
    );

    if (
      result.outcome === PaymentEventOutcome.TRANSFER_RECORDED ||
      result.outcome === PaymentEventOutcome.TRANSFER_FAILURE_RECORDED
    ) {
      const subaccountCode = data.subaccount?.subaccount_code ?? null;
      const payload: TransferCompletedEvent | TransferFailedEvent = {
        reference: data.reference,
        amountNaira: result.amountNaira,
        reason: data.reason ?? 'unknown',
        paystackSubaccountCode: subaccountCode,
      };
      this.eventEmitter.emit(succeeded ? TRANSFER_COMPLETED : TRANSFER_FAILED, payload);
    }

    return result;
  }

  private async emitForProcessedResult(
    result: PaymentEventResult,
    reference: string,
  ): Promise<void> {
    if (result.outcome !== PaymentEventOutcome.PAYMENT_PROCESSED) return;

    if (result.target === PaymentTarget.SCHOOL_INVOICE) {
      const tx = await this.prisma.platformTransaction.findUnique({
        where: { paymentReference: reference },
        select: { id: true },
      });
      const paystackEvent = await this.prisma.paystackEvent.findFirst({
        where: { reference, eventType: 'charge.success' },
        orderBy: { createdAt: 'desc' },
        select: { payload: true },
      });
      const metadata = this.extractInvoiceMetadata(paystackEvent?.payload);
      const event: SchoolInvoicePaidEvent = {
        invoiceId: result.invoiceId,
        schoolId: result.schoolId,
        termId: result.termId,
        paidByUserId: metadata?.paidByUserId ?? '',
        reference,
        amountNaira: result.amountNaira,
      };
      this.eventEmitter.emit(SCHOOL_INVOICE_PAID, event);
      // touch tx to satisfy linter if any future read is added
      void tx;
      return;
    }

    const studentPayment = await this.prisma.studentPayment.findUnique({
      where: { id: result.studentPaymentId },
      include: {
        student: { select: { userId: true, user: { select: { schoolId: true } } } },
      },
    });
    if (!studentPayment?.student?.user?.schoolId) return;
    const event: PaymentCompletedEvent = {
      studentPaymentId: result.studentPaymentId,
      studentUserId: studentPayment.student.userId,
      schoolId: studentPayment.student.user.schoolId,
      amountNaira: result.amountNaira,
      reference,
      status: result.status as Extract<PaymentStatus, 'PAID' | 'PARTIAL'>,
    };
    this.eventEmitter.emit(PAYMENT_COMPLETED, event);
  }

  private extractInvoiceMetadata(payload: unknown): { paidByUserId?: string } | null {
    if (!payload || typeof payload !== 'object') return null;
    const meta = (payload as { metadata?: unknown }).metadata;
    if (!meta || typeof meta !== 'object') return null;
    return meta as { paidByUserId?: string };
  }

  private async emitForFailedResult(
    result: PaymentEventResult,
    data: PaystackChargeData,
  ): Promise<void> {
    if (result.outcome !== PaymentEventOutcome.PAYMENT_FAILURE_RECORDED) return;
    if (!result.studentPaymentId) return;

    const reason = data.gateway_response ?? 'unknown';
    const studentPayment = await this.prisma.studentPayment.findUnique({
      where: { id: result.studentPaymentId },
      include: {
        student: { select: { userId: true, user: { select: { schoolId: true } } } },
      },
    });
    const event: PaymentFailedEvent = {
      reference: data.reference,
      studentPaymentId: result.studentPaymentId,
      studentUserId: studentPayment?.student?.userId ?? null,
      schoolId: studentPayment?.student?.user?.schoolId ?? null,
      reason,
    };
    this.eventEmitter.emit(PAYMENT_FAILED, event);
  }
}
