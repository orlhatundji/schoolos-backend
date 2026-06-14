import { PaymentStatus } from '@prisma/client';

/**
 * Typed shape passed to the Handlebars receipt template.
 * Same data renders both the inline email HTML and the PDF attachment.
 */
export interface ReceiptTemplateData {
  school: {
    name: string;
    logoSrc: string;
    addressLine: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  student: {
    fullName: string;
    studentNo: string;
    className: string | null;
  };
  payment: {
    structureName: string;
    sessionName: string | null;
    termName: string | null;
    overallStatus: PaymentStatus;
    /** Full fee amount the student owes for this PaymentStructure. */
    totalFeeNaira: number;
    /** What had already been paid before this transaction landed. */
    previouslyPaidNaira: number;
    /** Cumulative paid including this transaction. */
    paidToDateNaira: number;
    outstandingNaira: number;
  };
  transaction: {
    amountNaira: number;
    paidAtDisplay: string;
    methodDisplay: string;
    reference: string;
    breakdown: {
      /** School-fee portion settled by THIS transaction (recipient nets this). */
      schoolFeesNaira: number;
      paystackFeeNaira: number;
      /** What the parent paid in this transaction (schoolFees + paystackFee). */
      totalNaira: number;
    };
  };
  receiptDownloadUrl: string | null;
}
