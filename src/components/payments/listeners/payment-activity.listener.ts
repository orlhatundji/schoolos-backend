import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PaymentStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  PAYMENT_COMPLETED,
  PAYMENT_FAILED,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  TRANSFER_COMPLETED,
  TRANSFER_FAILED,
  TransferCompletedEvent,
  TransferFailedEvent,
} from '../domain/events/payment-events';

const PAYMENT_COMPLETED_ACTION = 'PAYMENT_COMPLETED';
const PAYMENT_FAILED_ACTION = 'PAYMENT_FAILED';
const TRANSFER_SUCCESS_ACTION = 'TRANSFER_SUCCESS';
const TRANSFER_FAILED_ACTION = 'TRANSFER_FAILED';
const ENTITY_TYPE = 'PAYMENT';
const CATEGORY = 'FINANCIAL';
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'] as const;

@Injectable()
export class PaymentActivityListener {
  private readonly logger = new Logger(PaymentActivityListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(PAYMENT_COMPLETED, { async: true })
  async onPaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const description =
      event.status === PaymentStatus.PAID
        ? `Payment of ${this.formatNaira(event.amountNaira)} completed (Ref: ${event.reference})`
        : `Partial payment of ${this.formatNaira(event.amountNaira)} received (Ref: ${event.reference})`;

    await this.logActivity({
      userId: event.studentUserId,
      schoolId: event.schoolId,
      action: PAYMENT_COMPLETED_ACTION,
      description,
      details: {
        studentPaymentId: event.studentPaymentId,
        amount: event.amountNaira,
        reference: event.reference,
        status: event.status,
      },
    });
  }

  @OnEvent(PAYMENT_FAILED, { async: true })
  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    if (!event.studentUserId || !event.schoolId) return;

    await this.logActivity({
      userId: event.studentUserId,
      schoolId: event.schoolId,
      action: PAYMENT_FAILED_ACTION,
      description: `Payment failed: ${event.reason} (Ref: ${event.reference})`,
      details: {
        studentPaymentId: event.studentPaymentId,
        reference: event.reference,
        reason: event.reason,
      },
    });
  }

  @OnEvent(TRANSFER_COMPLETED, { async: true })
  async onTransferCompleted(event: TransferCompletedEvent): Promise<void> {
    await this.logTransferActivity(event, true);
  }

  @OnEvent(TRANSFER_FAILED, { async: true })
  async onTransferFailed(event: TransferFailedEvent): Promise<void> {
    await this.logTransferActivity(event, false);
  }

  private async logTransferActivity(
    event: TransferCompletedEvent | TransferFailedEvent,
    succeeded: boolean,
  ): Promise<void> {
    const schoolId = await this.lookupSchoolIdBySubaccount(event.paystackSubaccountCode);
    if (!schoolId) {
      this.logger.warn(
        `Transfer ${succeeded ? 'succeeded' : 'failed'} but no school resolved (ref: ${event.reference})`,
      );
      return;
    }
    const action = succeeded ? TRANSFER_SUCCESS_ACTION : TRANSFER_FAILED_ACTION;
    const description = succeeded
      ? `Transfer of ${this.formatNaira(event.amountNaira)} settled (Ref: ${event.reference})`
      : `Transfer of ${this.formatNaira(event.amountNaira)} failed: ${event.reason} (Ref: ${event.reference})`;

    await this.logAdminActivity({
      schoolId,
      action,
      description,
      details: {
        amount: event.amountNaira,
        reference: event.reference,
        reason: event.reason,
      },
    });
  }

  private async lookupSchoolIdBySubaccount(
    paystackSubaccountCode: string | null,
  ): Promise<string | null> {
    if (!paystackSubaccountCode) return null;
    const bankAccount = await this.prisma.schoolBankAccount.findFirst({
      where: { paystackSubaccountCode },
      select: { schoolId: true },
    });
    return bankAccount?.schoolId ?? null;
  }

  private async logAdminActivity(input: {
    schoolId: string;
    action: string;
    description: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { schoolId: input.schoolId, type: { in: [...ADMIN_ROLES] } },
        select: { id: true },
      });
      if (admins.length === 0) return;

      await this.prisma.userActivity.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          schoolId: input.schoolId,
          action: input.action,
          entityType: ENTITY_TYPE,
          description: input.description,
          details: { ...input.details, loggedFor: 'school_admin' } as never,
          ipAddress: 'webhook',
          userAgent: 'paystack-webhook',
          category: CATEGORY,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Failed to log transfer activity: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async logActivity(input: {
    userId: string;
    schoolId: string;
    action: string;
    description: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.userActivity.create({
        data: {
          userId: input.userId,
          schoolId: input.schoolId,
          action: input.action,
          entityType: ENTITY_TYPE,
          description: input.description,
          details: input.details as never,
          ipAddress: 'webhook',
          userAgent: 'paystack-webhook',
          category: CATEGORY,
        },
      });

      const admins = await this.prisma.user.findMany({
        where: { schoolId: input.schoolId, type: { in: [...ADMIN_ROLES] } },
        select: { id: true },
      });

      if (admins.length === 0) return;

      await this.prisma.userActivity.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          schoolId: input.schoolId,
          action: input.action,
          entityType: ENTITY_TYPE,
          description: input.description,
          details: { ...input.details, loggedFor: 'school_admin' } as never,
          ipAddress: 'webhook',
          userAgent: 'paystack-webhook',
          category: CATEGORY,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Failed to log payment activity: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private formatNaira(amount: number): string {
    return `₦${amount.toLocaleString('en-NG')}`;
  }
}
