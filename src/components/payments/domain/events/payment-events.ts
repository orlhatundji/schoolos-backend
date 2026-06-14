import { PaymentStatus } from '@prisma/client';

export const PAYMENT_COMPLETED = 'payment.completed';
export const PAYMENT_FAILED = 'payment.failed';
export const TRANSFER_COMPLETED = 'transfer.completed';
export const TRANSFER_FAILED = 'transfer.failed';
export const SCHOOL_INVOICE_PAID = 'school-invoice.paid';

export interface PaymentCompletedEvent {
  studentPaymentId: string;
  studentUserId: string;
  schoolId: string;
  amountNaira: number;
  reference: string;
  status: Extract<PaymentStatus, 'PAID' | 'PARTIAL'>;
}

export interface PaymentFailedEvent {
  reference: string;
  studentPaymentId: string | null;
  studentUserId: string | null;
  schoolId: string | null;
  reason: string;
}

export interface TransferCompletedEvent {
  reference: string;
  amountNaira: number;
  reason: string;
  paystackSubaccountCode: string | null;
}

export interface TransferFailedEvent {
  reference: string;
  amountNaira: number;
  reason: string;
  paystackSubaccountCode: string | null;
}

export interface SchoolInvoicePaidEvent {
  invoiceId: string;
  schoolId: string;
  termId: string;
  paidByUserId: string;
  reference: string;
  amountNaira: number;
}
