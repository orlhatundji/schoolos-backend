import { ConfigService } from '@nestjs/config';

import { BillingService } from './billing.service';

type InvoiceRow = {
  id: string;
  schoolId: string;
  termId: string;
  status: 'ISSUED' | 'PAID' | 'WAIVED' | 'CANCELLED';
  studentCount: number;
  unitFee: number;
  totalAmount: number;
  waivedById: string | null;
  waiverReason: string | null;
};

function buildService(initialState: {
  schools: { id: string; createdAt: Date; serviceFeeOverride: number | null }[];
  terms: { id: string; academicSessionId: string; startDate: Date; endDate: Date }[];
  invoices?: InvoiceRow[];
  activeStudentsBySchoolAndSession?: Record<string, number>;
}) {
  const invoices: InvoiceRow[] = [...(initialState.invoices ?? [])];

  const prisma = {
    school: {
      findMany: jest.fn(async () => initialState.schools),
    },
    term: {
      findUnique: jest.fn(async ({ where: { id } }: { where: { id: string } }) =>
        initialState.terms.find((t) => t.id === id) ?? null,
      ),
    },
    student: {
      count: jest.fn(async ({ where }: { where: { user: { schoolId: string }; classArmStudents: { some: { classArm: { academicSessionId: string } } } } }) => {
        const key = `${where.user.schoolId}:${where.classArmStudents.some.classArm.academicSessionId}`;
        return initialState.activeStudentsBySchoolAndSession?.[key] ?? 0;
      }),
    },
    schoolInvoice: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.schoolId_termId) {
          return (
            invoices.find(
              (i) => i.schoolId === where.schoolId_termId.schoolId && i.termId === where.schoolId_termId.termId,
            ) ?? null
          );
        }
        if (where.id) return invoices.find((i) => i.id === where.id) ?? null;
        return null;
      }),
      findFirst: jest.fn(async ({ where }: { where: { schoolId: string } }) =>
        invoices.find((i) => i.schoolId === where.schoolId) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: any }) => {
        const row: InvoiceRow = {
          id: `inv_${invoices.length + 1}`,
          schoolId: data.schoolId,
          termId: data.termId,
          status: data.status,
          studentCount: data.studentCount,
          unitFee: data.unitFee,
          totalAmount: data.totalAmount,
          waivedById: data.waivedById ?? null,
          waiverReason: data.waiverReason ?? null,
        };
        invoices.push(row);
        return row;
      }),
    },
  };

  const invoicePdfService = {
    generateAndArchive: jest.fn(async () => ({
      pdf: Buffer.from('pdf'),
      publicUrl: 'https://example/pdf',
      html: '<html/>',
    })),
    loadInvoice: jest.fn(async () => ({})),
  };

  const mailQueueService = { add: jest.fn(async () => undefined) };
  const configService = {
    get: jest.fn((key: string) => (key === 'schos.serviceFeeNaira' ? 500 : undefined)),
  };

  const service = new BillingService(
    prisma as any,
    configService as unknown as ConfigService,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    invoicePdfService as any,
    {} as any,
    mailQueueService as any,
  );

  return { service, prisma, invoices, invoicePdfService };
}

describe('BillingService.generateInvoicesForTerm', () => {
  const school = { id: 'sch_1', createdAt: new Date('2026-01-01'), serviceFeeOverride: null };
  const term = {
    id: 'term_1',
    academicSessionId: 'sess_1',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-07-31'),
  };

  it('issues a WAIVED welcome-offer for a school with no prior invoices', async () => {
    const { service, invoices } = buildService({
      schools: [school],
      terms: [term],
      activeStudentsBySchoolAndSession: { 'sch_1:sess_1': 200 },
    });

    const report = await service.generateInvoicesForTerm(term.id);

    expect(report.generatedFree).toBe(1);
    expect(report.generated).toBe(0);
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({
      status: 'WAIVED',
      totalAmount: 0,
      waivedById: null,
      waiverReason: expect.stringContaining('welcome'),
    });
  });

  it('issues an ISSUED invoice on subsequent terms', async () => {
    const term2 = { ...term, id: 'term_2', startDate: new Date('2026-08-01'), endDate: new Date('2026-11-30') };
    const { service, invoices } = buildService({
      schools: [school],
      terms: [term, term2],
      invoices: [
        {
          id: 'inv_existing',
          schoolId: 'sch_1',
          termId: 'term_1',
          status: 'WAIVED',
          studentCount: 200,
          unitFee: 500,
          totalAmount: 0,
          waivedById: null,
          waiverReason: 'First term free — welcome offer',
        },
      ],
      activeStudentsBySchoolAndSession: { 'sch_1:sess_1': 200 },
    });

    const report = await service.generateInvoicesForTerm(term2.id);

    expect(report.generated).toBe(1);
    expect(report.generatedFree).toBe(0);
    expect(invoices.find((i) => i.termId === 'term_2')).toMatchObject({
      status: 'ISSUED',
      totalAmount: 100_000,
    });
  });

  it('skips pre-signup terms', async () => {
    const pastTerm = { ...term, endDate: new Date('2025-12-31') };
    const { service, invoices } = buildService({
      schools: [school],
      terms: [pastTerm],
      activeStudentsBySchoolAndSession: { 'sch_1:sess_1': 200 },
    });

    const report = await service.generateInvoicesForTerm(pastTerm.id);

    expect(report.skipped.preSignupTerm).toBe(1);
    expect(invoices).toHaveLength(0);
  });

  it('skips when zero active students', async () => {
    const { service, invoices } = buildService({
      schools: [school],
      terms: [term],
      activeStudentsBySchoolAndSession: { 'sch_1:sess_1': 0 },
    });

    const report = await service.generateInvoicesForTerm(term.id);

    expect(report.skipped.noStudents).toBe(1);
    expect(invoices).toHaveLength(0);
  });

  it('skips schools that already have an invoice for the term', async () => {
    const { service } = buildService({
      schools: [school],
      terms: [term],
      invoices: [
        {
          id: 'inv_existing',
          schoolId: 'sch_1',
          termId: 'term_1',
          status: 'ISSUED',
          studentCount: 200,
          unitFee: 500,
          totalAmount: 100_000,
          waivedById: null,
          waiverReason: null,
        },
      ],
      activeStudentsBySchoolAndSession: { 'sch_1:sess_1': 200 },
    });

    const report = await service.generateInvoicesForTerm(term.id);

    expect(report.skipped.existing).toBe(1);
  });

  it('uses serviceFeeOverride when set', async () => {
    const override = { ...school, serviceFeeOverride: 250 };
    const { service, invoices } = buildService({
      schools: [override],
      terms: [term],
      invoices: [
        {
          id: 'inv_existing',
          schoolId: 'sch_1',
          termId: 'term_0',
          status: 'WAIVED',
          studentCount: 100,
          unitFee: 250,
          totalAmount: 0,
          waivedById: null,
          waiverReason: 'welcome',
        },
      ],
      activeStudentsBySchoolAndSession: { 'sch_1:sess_1': 100 },
    });

    await service.generateInvoicesForTerm(term.id);
    const issued = invoices.find((i) => i.termId === 'term_1');
    expect(issued).toMatchObject({ status: 'ISSUED', unitFee: 250, totalAmount: 25_000 });
  });
});
