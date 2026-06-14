import { Prisma } from '@prisma/client';

import { Money } from './money';

describe('Money', () => {
  describe('fromKobo', () => {
    it('accepts integer kobo values', () => {
      expect(Money.fromKobo(150).toKobo()).toBe(150);
    });

    it('rejects non-integer kobo numbers', () => {
      expect(() => Money.fromKobo(1.5)).toThrow();
    });

    it('rejects negative values', () => {
      expect(() => Money.fromKobo(-1)).toThrow();
    });
  });

  describe('fromNaira', () => {
    it('handles whole naira', () => {
      expect(Money.fromNaira(100).toKobo()).toBe(10_000);
    });

    it('handles 2dp naira', () => {
      expect(Money.fromNaira('99.99').toKobo()).toBe(9_999);
      expect(Money.fromNaira(0.01).toKobo()).toBe(1);
    });

    it('handles Prisma Decimal input', () => {
      const decimal = new Prisma.Decimal('1234.56');
      expect(Money.fromNaira(decimal).toKobo()).toBe(123_456);
    });

    it('rejects more than 2 decimal places', () => {
      expect(() => Money.fromNaira('1.234')).toThrow();
    });
  });

  describe('arithmetic and comparison', () => {
    it('adds two money values', () => {
      const sum = Money.fromNaira(100).add(Money.fromNaira(50));
      expect(sum.toNaira()).toBe(150);
    });

    it('reports equality', () => {
      expect(Money.fromKobo(500).equals(Money.fromNaira(5))).toBe(true);
    });

    it('reports gte correctly', () => {
      expect(Money.fromNaira(100).gte(Money.fromNaira(100))).toBe(true);
      expect(Money.fromNaira(101).gte(Money.fromNaira(100))).toBe(true);
      expect(Money.fromNaira(99).gte(Money.fromNaira(100))).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('round-trips kobo <-> naira <-> Decimal without drift', () => {
      const original = Money.fromKobo(99_999_999);
      const roundTripped = Money.fromNaira(original.toDecimal());
      expect(roundTripped.equals(original)).toBe(true);
    });
  });
});
