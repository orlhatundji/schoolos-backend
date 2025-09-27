import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaystackService } from '../../../shared/services/paystack.service';
import { PaystackWebhookEventDto } from '../dto/paystack-webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class PaystackWebhookService {
  private readonly logger = new Logger(PaystackWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly configService: ConfigService,
  ) {}

  verifySignature(rawBody: Buffer, signature: string): boolean {
    try {
      const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');
      if (!secret) {
        this.logger.error('PAYSTACK_SECRET_KEY is not configured.');
        return false;
      }

      const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
      const trusted = Buffer.from(hash, 'hex');
      const untrusted = Buffer.from(signature, 'hex');

      if (trusted.length !== untrusted.length) {
        return false;
      }

      return crypto.timingSafeEqual(trusted, untrusted);
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  async handleWebhookEvent(
    webhookEvent: PaystackWebhookEventDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (webhookEvent.event) {
        case 'charge.success':
          return await this.handleChargeSuccess(webhookEvent.data);
        case 'charge.failed':
          return await this.handleChargeFailed(webhookEvent.data);
        case 'transfer.success':
          return await this.handleTransferSuccess(webhookEvent.data);
        case 'transfer.failed':
          return await this.handleTransferFailed(webhookEvent.data);
        default:
          this.logger.warn(`Unhandled webhook event: ${webhookEvent.event}`);
          return { success: true, message: 'Event received but not processed' };
      }
    } catch (error) {
      this.logger.error(`Error handling webhook event: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook event');
    }
  }

  private async handleChargeSuccess(
    transactionData: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { reference, amount } = transactionData;

      // First, try to find a student payment
      const studentPayment = await this.prisma.studentPayment.findFirst({
        where: {
          notes: {
            contains: reference,
          },
          deletedAt: null,
        },
        include: {
          student: {
            include: {
              user: true,
            },
          },
        },
      });

      if (studentPayment) {
        // Handle student payment
        const amountPaid = this.paystackService.convertFromKobo(amount);
        const newPaidAmount = Number(studentPayment.paidAmount) + amountPaid;
        const totalAmount = Number(studentPayment.amount);
        const newStatus = newPaidAmount >= totalAmount ? 'PAID' : 'PARTIAL';

        await this.prisma.studentPayment.update({
          where: { id: studentPayment.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
            paidAt: new Date(),
            notes: `Payment completed via webhook. Reference: ${reference}. Amount: ${amountPaid}`,
          },
        });

        await this.logPaymentActivity(studentPayment.student.userId, 'PAYMENT_COMPLETED', {
          paymentId: studentPayment.id,
          amount: amountPaid,
          reference,
          status: newStatus,
        });

        return { success: true, message: 'Student payment processed successfully' };
      }

      // If not a student payment, try to find a color scheme payment
      const colorSchemePayment = await this.prisma.colorSchemePayment.findFirst({
        where: {
          paymentReference: reference,
          status: 'PENDING',
        },
        include: {
          user: true,
        },
      });

      if (colorSchemePayment) {
        // Handle color scheme payment
        await this.prisma.colorSchemePayment.update({
          where: { id: colorSchemePayment.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });

        await this.logPaymentActivity(colorSchemePayment.userId, 'COLOR_SCHEME_PAYMENT_COMPLETED', {
          paymentId: colorSchemePayment.id,
          amount: Number(colorSchemePayment.amount),
          reference,
          status: 'PAID',
        });

        return { success: true, message: 'Color scheme payment processed successfully' };
      }

      this.logger.warn(`Payment not found for reference: ${reference}`);
      return { success: false, message: 'Payment record not found' };
    } catch (error) {
      this.logger.error(`Error handling charge success: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process successful payment');
    }
  }

  private async handleChargeFailed(
    transactionData: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { reference, gateway_response } = transactionData;

      // First, try to find a student payment
      const studentPayment = await this.prisma.studentPayment.findFirst({
        where: {
          notes: {
            contains: reference,
          },
          deletedAt: null,
        },
        include: {
          student: {
            include: {
              user: true,
            },
          },
        },
      });

      if (studentPayment) {
        await this.prisma.studentPayment.update({
          where: { id: studentPayment.id },
          data: {
            notes: `Payment failed via webhook. Reference: ${reference}. Reason: ${gateway_response}`,
          },
        });

        await this.logPaymentActivity(studentPayment.student.userId, 'PAYMENT_FAILED', {
          paymentId: studentPayment.id,
          reference,
          reason: gateway_response,
        });

        return { success: true, message: 'Student payment failure logged' };
      }

      // If not a student payment, try to find a color scheme payment
      const colorSchemePayment = await this.prisma.colorSchemePayment.findFirst({
        where: {
          paymentReference: reference,
          status: 'PENDING',
        },
        include: {
          user: true,
        },
      });

      if (colorSchemePayment) {
        // Mark color scheme payment as failed (we could add a FAILED status or just log it)
        await this.logPaymentActivity(colorSchemePayment.userId, 'COLOR_SCHEME_PAYMENT_FAILED', {
          paymentId: colorSchemePayment.id,
          reference,
          reason: gateway_response,
        });

        return { success: true, message: 'Color scheme payment failure logged' };
      }

      this.logger.warn(`Payment not found for failed reference: ${reference}`);
      return { success: false, message: 'Payment record not found' };
    } catch (error) {
      this.logger.error(`Error handling charge failure: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process payment failure');
    }
  }

  private async handleTransferSuccess(
    transferData: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { reference, amount, reason } = transferData;

      await this.logPaymentActivity(null, 'TRANSFER_SUCCESS', {
        reference,
        amount: this.paystackService.convertFromKobo(amount),
        reason,
      });

      return { success: true, message: 'Transfer processed successfully' };
    } catch (error) {
      this.logger.error(`Error handling transfer success: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process transfer success');
    }
  }

  private async handleTransferFailed(
    transferData: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { reference, amount, reason } = transferData;

      await this.logPaymentActivity(null, 'TRANSFER_FAILED', {
        reference,
        amount: this.paystackService.convertFromKobo(amount),
        reason,
      });

      return { success: true, message: 'Transfer failure processed' };
    } catch (error) {
      this.logger.error(`Error handling transfer failure: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process transfer failure');
    }
  }

  private async logPaymentActivity(
    userId: string | null,
    action: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { schoolId: true },
        });

        if (user?.schoolId) {
          await this.prisma.userActivity.create({
            data: {
              userId,
              schoolId: user.schoolId,
              action,
              entityType: 'PAYMENT',
              description: `Payment activity: ${action}`,
              details: details,
              ipAddress: 'webhook',
              userAgent: 'paystack-webhook',
              category: 'FINANCIAL',
            },
          });

          await this.logActivityForSchoolAdmins(user.schoolId, action, details);
        }
      }
    } catch (error) {
      this.logger.error(`Error logging payment activity: ${error.message}`, error.stack);
    }
  }

  private async logActivityForSchoolAdmins(
    schoolId: string,
    action: string,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      const schoolAdmins = await this.prisma.user.findMany({
        where: {
          schoolId: schoolId,
          type: {
            in: ['ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'],
          },
        },
        select: { id: true },
      });

      for (const admin of schoolAdmins) {
        await this.prisma.userActivity.create({
          data: {
            userId: admin.id,
            schoolId: schoolId,
            action,
            entityType: 'PAYMENT',
            description: `Student payment activity: ${action}`,
            details: {
              ...details,
              loggedFor: 'school_admin',
            },
            ipAddress: 'webhook',
            userAgent: 'paystack-webhook',
            category: 'FINANCIAL',
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error logging activity for school admins: ${error.message}`, error.stack);
    }
  }

  async getWebhookEvents(limit: number = 50): Promise<any[]> {
    try {
      return await this.prisma.userActivity.findMany({
        where: {
          entityType: 'PAYMENT',
          action: {
            in: ['PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'TRANSFER_SUCCESS', 'TRANSFER_FAILED'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Error fetching webhook events: ${error.message}`, error.stack);
      return [];
    }
  }
}
