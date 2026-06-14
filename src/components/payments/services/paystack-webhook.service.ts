import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PaystackWebhookEventDto } from '../dto/paystack-webhook.dto';
import { IgnoreReason, PaymentEventOutcome } from '../domain/payment-event-result';
import {
  PaymentService,
  PaymentEventResult,
  PaystackChargeData,
  PaystackTransferData,
} from '../payment.service';
import {
  isPaystackEventType,
  PaystackEventType,
} from '../paystack/paystack-event.constants';

@Injectable()
export class PaystackWebhookService {
  private readonly logger = new Logger(PaystackWebhookService.name);

  constructor(private readonly paymentService: PaymentService) {}

  async handle(event: PaystackWebhookEventDto): Promise<PaymentEventResult> {
    if (!event?.event || !event.data) {
      throw new BadRequestException('Malformed webhook event');
    }

    if (!isPaystackEventType(event.event)) {
      this.logger.warn(`Unhandled Paystack event type: ${event.event}`);
      return {
        outcome: PaymentEventOutcome.IGNORED,
        reason: IgnoreReason.UNHANDLED_EVENT_TYPE,
      };
    }

    const rawPayload = event as unknown as Prisma.InputJsonValue;

    switch (event.event) {
      case PaystackEventType.CHARGE_SUCCESS:
        return this.paymentService.handleChargeSuccess(
          this.toChargeData(event.data),
          rawPayload,
        );
      case PaystackEventType.CHARGE_FAILED:
        return this.paymentService.handleChargeFailed(
          this.toChargeData(event.data),
          rawPayload,
        );
      case PaystackEventType.TRANSFER_SUCCESS:
        return this.paymentService.handleTransferSuccess(
          this.toTransferData(event.data),
          rawPayload,
        );
      case PaystackEventType.TRANSFER_FAILED:
        return this.paymentService.handleTransferFailed(
          this.toTransferData(event.data),
          rawPayload,
        );
    }
  }

  private toChargeData(data: PaystackWebhookEventDto['data']): PaystackChargeData {
    return {
      id: data.id,
      reference: data.reference,
      amount: data.amount,
      status: data.status,
      gateway_response: data.gateway_response,
    };
  }

  private toTransferData(data: PaystackWebhookEventDto['data']): PaystackTransferData {
    const rawData = data as unknown as {
      reason?: string;
      recipient?: PaystackTransferData['recipient'];
      subaccount?: PaystackTransferData['subaccount'];
    };
    return {
      id: data.id,
      reference: data.reference,
      amount: data.amount,
      reason: rawData.reason,
      recipient: rawData.recipient,
      subaccount: rawData.subaccount,
    };
  }
}
