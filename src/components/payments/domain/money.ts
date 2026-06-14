import { Prisma } from '@prisma/client';

const KOBO_PER_NAIRA = 100n;

/**
 * Money value object. All amounts are stored internally as kobo (BigInt) to
 * avoid floating-point drift. Construct via `fromNaira` / `fromKobo`; never
 * pass `number` math results through this class without going through one
 * of the factories.
 */
export class Money {
  private constructor(private readonly kobo: bigint) {
    if (kobo < 0n) {
      throw new Error(`Money cannot be negative (got ${kobo} kobo)`);
    }
  }

  static fromKobo(kobo: number | bigint): Money {
    if (typeof kobo === 'number' && !Number.isInteger(kobo)) {
      throw new Error(`Kobo must be an integer (got ${kobo})`);
    }
    return new Money(BigInt(kobo));
  }

  static fromNaira(value: Prisma.Decimal | string | number): Money {
    const decimal = new Prisma.Decimal(value);
    if (decimal.decimalPlaces() > 2) {
      throw new Error(`Naira values cannot exceed 2 decimal places (got ${decimal.toString()})`);
    }
    const koboStr = decimal.mul(100).toFixed(0);
    return new Money(BigInt(koboStr));
  }

  static zero(): Money {
    return new Money(0n);
  }

  add(other: Money): Money {
    return new Money(this.kobo + other.kobo);
  }

  equals(other: Money): boolean {
    return this.kobo === other.kobo;
  }

  gte(other: Money): boolean {
    return this.kobo >= other.kobo;
  }

  isZero(): boolean {
    return this.kobo === 0n;
  }

  toKobo(): number {
    if (this.kobo > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('Money value exceeds Number.MAX_SAFE_INTEGER kobo');
    }
    return Number(this.kobo);
  }

  toNaira(): number {
    return Number(this.kobo) / 100;
  }

  toDecimal(): Prisma.Decimal {
    return new Prisma.Decimal(this.kobo.toString()).div(100);
  }
}

export { KOBO_PER_NAIRA };
