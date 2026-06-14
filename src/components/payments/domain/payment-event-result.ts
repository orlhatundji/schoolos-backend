export enum PaymentEventOutcome {
  PAYMENT_PROCESSED = 'payment_processed',
  PAYMENT_FAILURE_RECORDED = 'payment_failure_recorded',
  TRANSFER_RECORDED = 'transfer_recorded',
  TRANSFER_FAILURE_RECORDED = 'transfer_failure_recorded',
  DUPLICATE_EVENT = 'duplicate_event',
  IGNORED = 'ignored',
}

export enum IgnoreReason {
  NO_MATCHING_PAYMENT = 'no_matching_payment',
  PAYMENT_WAIVED = 'payment_waived',
  UNHANDLED_EVENT_TYPE = 'unhandled_event_type',
}

export enum PaymentTarget {
  STUDENT_PAYMENT = 'student_payment',
  SCHOOL_INVOICE = 'school_invoice',
}
