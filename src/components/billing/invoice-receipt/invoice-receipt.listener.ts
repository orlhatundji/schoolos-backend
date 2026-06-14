import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  SCHOOL_INVOICE_PAID,
  SchoolInvoicePaidEvent,
} from '../../payments/domain/events/payment-events';
import { InvoiceReceiptService } from './invoice-receipt.service';

@Injectable()
export class InvoiceReceiptListener {
  private readonly logger = new Logger(InvoiceReceiptListener.name);

  constructor(private readonly invoiceReceiptService: InvoiceReceiptService) {}

  @OnEvent(SCHOOL_INVOICE_PAID, { async: true })
  async onInvoicePaid(event: SchoolInvoicePaidEvent): Promise<void> {
    try {
      await this.invoiceReceiptService.sendReceipt(event.reference, event.paidByUserId);
    } catch (err) {
      this.logger.error(
        `Failed to send invoice receipt for ${event.reference}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
