import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  PAYMENT_COMPLETED,
  PaymentCompletedEvent,
} from '../domain/events/payment-events';
import { PaymentReceiptService } from './payment-receipt.service';

@Injectable()
export class PaymentReceiptListener {
  constructor(private readonly paymentReceiptService: PaymentReceiptService) {}

  @OnEvent(PAYMENT_COMPLETED, { async: true })
  async onPaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    await this.paymentReceiptService.sendReceipt(event.reference);
  }
}
