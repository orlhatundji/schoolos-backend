import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { FeeCalculationService } from '../../shared/services/fee-calculation.service';
import { PaymentService } from './payment.service';
import { PaystackApiClient } from './paystack/paystack-api.client';
import { PaystackEventRepository } from './paystack/paystack-event.repository';
import {
  TRANSFER_COMPLETED,
  TRANSFER_FAILED,
} from './domain/events/payment-events';

interface InMemoryDb {
  studentPayments: Map<string, any>;
  platformTransactions: Map<string, any>;
  colorSchemePayments: Map<string, any>;
  paystackEvents: Map<string, any>;
}

function makeDb(): InMemoryDb {
  return {
    studentPayments: new Map(),
    platformTransactions: new Map(),
    colorSchemePayments: new Map(),
    paystackEvents: new Map(),
  };
}

function makeTxClient(db: InMemoryDb) {
  return {
    paystackEvent: {
      create: jest.fn(async ({ data }: { data: any }) => {
        const key = String(data.paystackEventId);
        if (db.paystackEvents.has(key)) {
          throw new Prisma.PrismaClientKnownRequestError('unique', {
            code: 'P2002',
            clientVersion: 'x',
          });
        }
        db.paystackEvents.set(key, { ...data });
        return db.paystackEvents.get(key);
      }),
      update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
        const key = String(where.paystackEventId);
        const existing = db.paystackEvents.get(key) ?? {};
        db.paystackEvents.set(key, { ...existing, ...data });
        return db.paystackEvents.get(key);
      }),
    },
    platformTransaction: {
      findUnique: jest.fn(async ({ where }: { where: any }) => {
        return (
          [...db.platformTransactions.values()].find(
            (tx: any) => tx.paymentReference === where.paymentReference,
          ) ?? null
        );
      }),
      update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
        const existing = db.platformTransactions.get(where.id);
        const updated = { ...existing, ...data };
        db.platformTransactions.set(where.id, updated);
        return updated;
      }),
    },
    studentPayment: {
      findUniqueOrThrow: jest.fn(async ({ where }: { where: any }) => {
        const p = db.studentPayments.get(where.id);
        if (!p) throw new Error('not found');
        return p;
      }),
      updateMany: jest.fn(async ({ where, data }: { where: any; data: any }) => {
        const p = db.studentPayments.get(where.id);
        if (!p || (where.status && p.status !== where.status)) return { count: 0 };
        db.studentPayments.set(where.id, { ...p, ...data });
        return { count: 1 };
      }),
    },
    colorSchemePayment: {
      findFirst: jest.fn(async ({ where }: { where: any }) => {
        return (
          [...db.colorSchemePayments.values()].find(
            (p: any) => p.paymentReference === where.paymentReference,
          ) ?? null
        );
      }),
      updateMany: jest.fn(async ({ where, data }: { where: any; data: any }) => {
        const p = db.colorSchemePayments.get(where.id);
        if (!p || (where.status && p.status !== where.status)) return { count: 0 };
        db.colorSchemePayments.set(where.id, { ...p, ...data });
        return { count: 1 };
      }),
    },
  };
}

function makePrismaService(db: InMemoryDb): PrismaService {
  return {
    $transaction: jest.fn(async (cb: any) => cb(makeTxClient(db))),
    studentPayment: { findUnique: jest.fn().mockResolvedValue(null) },
    colorSchemePayment: { findUnique: jest.fn().mockResolvedValue(null) },
  } as unknown as PrismaService;
}

function makeStubs() {
  return {
    paystackApiClient: {
      convertFromKobo: (kobo: number) => kobo / 100,
      convertToKobo: (naira: number) => Math.round(naira * 100),
      generateReference: () => 'REF_TEST',
      initializePayment: jest.fn(),
      verifyPayment: jest.fn(),
      listBanks: jest.fn(),
      resolveAccountNumber: jest.fn(),
      createSubaccount: jest.fn(),
      updateSubaccount: jest.fn(),
    } as unknown as PaystackApiClient,
    feeCalculationService: {} as FeeCalculationService,
    eventEmitter: { emit: jest.fn() } as unknown as EventEmitter2,
    configService: { get: jest.fn(() => undefined) } as unknown as ConfigService,
  };
}

function seedStudent(db: InMemoryDb) {
  db.studentPayments.set('sp_1', {
    id: 'sp_1',
    status: 'PENDING',
    amount: new Prisma.Decimal('1000.00'),
    paidAmount: new Prisma.Decimal('0.00'),
    paidAt: null,
  });
  db.platformTransactions.set('ptx_1', {
    id: 'ptx_1',
    paymentReference: 'REF_ABC',
    operationType: 'STUDENT_PAYMENT',
    operationId: 'sp_1',
    totalCharged: new Prisma.Decimal('1020.00'),
    feeAmount: new Prisma.Decimal('1000.00'),
    status: 'PENDING',
  });
}

function seedColorScheme(db: InMemoryDb) {
  db.colorSchemePayments.set('cs_1', {
    id: 'cs_1',
    status: 'PENDING',
    amount: new Prisma.Decimal('500.00'),
    paymentReference: 'REF_CS_1',
    userId: 'user_1',
  });
}

describe('PaymentService.handleChargeSuccess', () => {
  it('records a student payment exactly once across duplicate webhooks', async () => {
    const db = makeDb();
    seedStudent(db);
    const prisma = makePrismaService(db);
    const repo = new PaystackEventRepository(prisma);
    const stubs = makeStubs();
    const svc = new PaymentService(
      prisma,
      stubs.paystackApiClient,
      repo,
      stubs.feeCalculationService,
      stubs.eventEmitter,
      stubs.configService,
    );

    const data = { id: 9001, reference: 'REF_ABC', amount: 102_000, status: 'success' };
    const first = await svc.handleChargeSuccess(data, data as any);
    const second = await svc.handleChargeSuccess(data, data as any);

    expect(first.outcome).toBe('payment_processed');
    if (first.outcome === 'payment_processed') {
      expect(first.target).toBe('student_payment');
    }
    expect(second.outcome).toBe('duplicate_event');
    expect(db.studentPayments.get('sp_1').paidAmount.toString()).toBe('1000');
    expect(db.studentPayments.get('sp_1').status).toBe('PAID');
    expect(db.platformTransactions.get('ptx_1').status).toBe('SETTLED');
  });

  it('rejects an amount mismatch and marks the event FAILED', async () => {
    const db = makeDb();
    seedStudent(db);
    const prisma = makePrismaService(db);
    const repo = new PaystackEventRepository(prisma);
    const stubs = makeStubs();
    const svc = new PaymentService(
      prisma,
      stubs.paystackApiClient,
      repo,
      stubs.feeCalculationService,
      stubs.eventEmitter,
      stubs.configService,
    );

    const tampered = { id: 9002, reference: 'REF_ABC', amount: 999_999, status: 'success' };
    await expect(svc.handleChargeSuccess(tampered, tampered as any)).rejects.toThrow(
      /amount does not match/i,
    );
    expect(db.paystackEvents.get('9002').status).toBe('FAILED');
    expect(db.studentPayments.get('sp_1').status).toBe('PENDING');
  });

  it('marks event IGNORED when no payment matches the reference', async () => {
    const db = makeDb();
    seedStudent(db);
    const prisma = makePrismaService(db);
    const repo = new PaystackEventRepository(prisma);
    const stubs = makeStubs();
    const svc = new PaymentService(
      prisma,
      stubs.paystackApiClient,
      repo,
      stubs.feeCalculationService,
      stubs.eventEmitter,
      stubs.configService,
    );

    const data = { id: 9003, reference: 'UNKNOWN_REF', amount: 102_000, status: 'success' };
    const result = await svc.handleChargeSuccess(data, data as any);
    expect(result.outcome).toBe('ignored');
    expect(db.paystackEvents.get('9003').status).toBe('IGNORED');
  });

  it('refuses to record against a WAIVED student payment', async () => {
    const db = makeDb();
    seedStudent(db);
    db.studentPayments.get('sp_1').status = 'WAIVED';
    const prisma = makePrismaService(db);
    const repo = new PaystackEventRepository(prisma);
    const stubs = makeStubs();
    const svc = new PaymentService(
      prisma,
      stubs.paystackApiClient,
      repo,
      stubs.feeCalculationService,
      stubs.eventEmitter,
      stubs.configService,
    );

    const data = { id: 9004, reference: 'REF_ABC', amount: 102_000, status: 'success' };
    const result = await svc.handleChargeSuccess(data, data as any);
    expect(result.outcome).toBe('ignored');
    expect(db.studentPayments.get('sp_1').paidAmount.toString()).toBe('0');
  });

  it('ignores a reference with no matching PlatformTransaction (no longer falls back to color scheme)', async () => {
    const db = makeDb();
    seedColorScheme(db);
    const prisma = makePrismaService(db);
    const repo = new PaystackEventRepository(prisma);
    const stubs = makeStubs();
    const svc = new PaymentService(
      prisma,
      stubs.paystackApiClient,
      repo,
      stubs.feeCalculationService,
      stubs.eventEmitter,
      stubs.configService,
    );

    const data = { id: 9005, reference: 'REF_CS_1', amount: 50_000, status: 'success' };
    const result = await svc.handleChargeSuccess(data, data as any);

    expect(result.outcome).toBe('ignored');
    expect(db.paystackEvents.get('9005').status).toBe('IGNORED');
    expect(db.colorSchemePayments.get('cs_1').status).toBe('PENDING');
  });
});

describe('PaymentService.handleTransfer*', () => {
  it('emits TRANSFER_COMPLETED on transfer.success and marks event processed', async () => {
    const db = makeDb();
    const prisma = makePrismaService(db);
    const repo = new PaystackEventRepository(prisma);
    const stubs = makeStubs();
    const svc = new PaymentService(
      prisma,
      stubs.paystackApiClient,
      repo,
      stubs.feeCalculationService,
      stubs.eventEmitter,
      stubs.configService,
    );

    const data = {
      id: 7001,
      reference: 'TRF_REF',
      amount: 500_000,
      reason: 'Settlement',
      subaccount: { subaccount_code: 'ACCT_xxx' },
    };
    const result = await svc.handleTransferSuccess(data, data as any);

    expect(result.outcome).toBe('transfer_recorded');
    if (result.outcome === 'transfer_recorded') {
      expect(result.amountNaira).toBe(5_000);
    }
    expect(stubs.eventEmitter.emit).toHaveBeenCalledWith(
      TRANSFER_COMPLETED,
      expect.objectContaining({ reference: 'TRF_REF', paystackSubaccountCode: 'ACCT_xxx' }),
    );
    expect(db.paystackEvents.get('7001').status).toBe('PROCESSED');
  });

  it('emits TRANSFER_FAILED on transfer.failed', async () => {
    const db = makeDb();
    const prisma = makePrismaService(db);
    const repo = new PaystackEventRepository(prisma);
    const stubs = makeStubs();
    const svc = new PaymentService(
      prisma,
      stubs.paystackApiClient,
      repo,
      stubs.feeCalculationService,
      stubs.eventEmitter,
      stubs.configService,
    );

    const data = {
      id: 7002,
      reference: 'TRF_REF_2',
      amount: 250_000,
      reason: 'Failed at bank',
    };
    await svc.handleTransferFailed(data, data as any);

    expect(stubs.eventEmitter.emit).toHaveBeenCalledWith(
      TRANSFER_FAILED,
      expect.objectContaining({ reference: 'TRF_REF_2', reason: 'Failed at bank' }),
    );
  });

  it('does not emit on duplicate transfer event', async () => {
    const db = makeDb();
    const prisma = makePrismaService(db);
    const repo = new PaystackEventRepository(prisma);
    const stubs = makeStubs();
    const svc = new PaymentService(
      prisma,
      stubs.paystackApiClient,
      repo,
      stubs.feeCalculationService,
      stubs.eventEmitter,
      stubs.configService,
    );

    const data = { id: 7003, reference: 'TRF_REF_3', amount: 100_000 };
    await svc.handleTransferSuccess(data, data as any);
    (stubs.eventEmitter.emit as jest.Mock).mockClear();
    const second = await svc.handleTransferSuccess(data, data as any);

    expect(second.outcome).toBe('duplicate_event');
    expect(stubs.eventEmitter.emit).not.toHaveBeenCalled();
  });
});
