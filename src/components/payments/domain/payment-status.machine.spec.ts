import { PaymentStatus } from '@prisma/client';

import { Money } from './money';
import {
  assertCanTransition,
  canTransition,
  nextStatusForCredit,
} from './payment-status.machine';

const ALL_STATUSES: PaymentStatus[] = [
  'PENDING',
  'PAID',
  'OVERDUE',
  'PARTIAL',
  'WAIVED',
  'EXPIRED',
];

describe('payment-status.machine', () => {
  describe('canTransition', () => {
    it('allows self-transition for every status', () => {
      for (const s of ALL_STATUSES) {
        expect(canTransition(s, s)).toBe(true);
      }
    });

    it('blocks PAID -> PARTIAL (no downgrade)', () => {
      expect(canTransition('PAID', 'PARTIAL')).toBe(false);
    });

    it('blocks PAID -> PENDING', () => {
      expect(canTransition('PAID', 'PENDING')).toBe(false);
    });

    it('allows PAID -> WAIVED', () => {
      expect(canTransition('PAID', 'WAIVED')).toBe(true);
    });

    it('allows PENDING -> PARTIAL -> PAID', () => {
      expect(canTransition('PENDING', 'PARTIAL')).toBe(true);
      expect(canTransition('PARTIAL', 'PAID')).toBe(true);
    });

    it('allows WAIVED -> PENDING (unwaive)', () => {
      expect(canTransition('WAIVED', 'PENDING')).toBe(true);
    });
  });

  describe('assertCanTransition', () => {
    it('throws on illegal transition', () => {
      expect(() => assertCanTransition('PAID', 'PARTIAL')).toThrow();
    });

    it('passes on legal transition', () => {
      expect(() => assertCanTransition('PENDING', 'PAID')).not.toThrow();
    });
  });

  describe('nextStatusForCredit', () => {
    const total = Money.fromNaira(1000);

    it('returns PAID when new paid amount reaches total', () => {
      expect(nextStatusForCredit('PENDING', Money.fromNaira(1000), total)).toBe('PAID');
    });

    it('returns PARTIAL when below total', () => {
      expect(nextStatusForCredit('PENDING', Money.fromNaira(500), total)).toBe('PARTIAL');
    });

    it('keeps PAID idempotent', () => {
      expect(nextStatusForCredit('PAID', Money.fromNaira(1000), total)).toBe('PAID');
    });

    it('refuses to credit WAIVED payments', () => {
      expect(() => nextStatusForCredit('WAIVED', Money.fromNaira(1000), total)).toThrow();
    });
  });
});
