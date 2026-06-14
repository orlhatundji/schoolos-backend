export enum PaystackEventType {
  CHARGE_SUCCESS = 'charge.success',
  CHARGE_FAILED = 'charge.failed',
  TRANSFER_SUCCESS = 'transfer.success',
  TRANSFER_FAILED = 'transfer.failed',
}

export function isPaystackEventType(value: string): value is PaystackEventType {
  return (Object.values(PaystackEventType) as string[]).includes(value);
}
