export class InitiateInvoicePaymentResponseDto {
  authorizationUrl: string;
  reference: string;
  amountDue: number;
}
