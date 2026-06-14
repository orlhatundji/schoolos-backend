import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

import { Money } from './money';

const ALLOWED: Record<PaymentStatus, ReadonlyArray<PaymentStatus>> = {
  PENDING: ['PARTIAL', 'PAID', 'WAIVED', 'OVERDUE', 'EXPIRED'],
  PARTIAL: ['PARTIAL', 'PAID', 'WAIVED'],
  OVERDUE: ['PARTIAL', 'PAID', 'WAIVED', 'EXPIRED'],
  PAID: ['WAIVED'],
  WAIVED: ['PENDING'],
  EXPIRED: ['PAID', 'WAIVED'],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertCanTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(`Illegal status transition: ${from} -> ${to}`);
  }
}

/**
 * Compute the next status for an incremental credit given the new paid amount.
 * Does NOT apply waiver/expiry logic — those are admin-driven transitions.
 */
export function nextStatusForCredit(
  current: PaymentStatus,
  newPaid: Money,
  total: Money,
): PaymentStatus {
  if (current === 'WAIVED') {
    throw new BadRequestException('Cannot credit a waived payment');
  }
  if (current === 'PAID') {
    return 'PAID';
  }
  return newPaid.gte(total) ? 'PAID' : 'PARTIAL';
}
