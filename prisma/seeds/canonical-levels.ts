import { PrismaClient } from '@prisma/client';

import { SeedRunResult } from './types';

interface CanonicalLevelSeed {
  code: string;
  name: string;
  group: string;
  order: number;
}

const CANONICAL_LEVELS: ReadonlyArray<CanonicalLevelSeed> = [
  // Nigerian primary
  { code: 'PRY1', name: 'Primary 1', group: 'PRIMARY', order: 1 },
  { code: 'PRY2', name: 'Primary 2', group: 'PRIMARY', order: 2 },
  { code: 'PRY3', name: 'Primary 3', group: 'PRIMARY', order: 3 },
  { code: 'PRY4', name: 'Primary 4', group: 'PRIMARY', order: 4 },
  { code: 'PRY5', name: 'Primary 5', group: 'PRIMARY', order: 5 },
  { code: 'PRY6', name: 'Primary 6', group: 'PRIMARY', order: 6 },
  // Nigerian junior secondary
  { code: 'JSS1', name: 'Junior Secondary 1', group: 'JUNIOR_SECONDARY', order: 7 },
  { code: 'JSS2', name: 'Junior Secondary 2', group: 'JUNIOR_SECONDARY', order: 8 },
  { code: 'JSS3', name: 'Junior Secondary 3', group: 'JUNIOR_SECONDARY', order: 9 },
  // Nigerian senior secondary
  { code: 'SSS1', name: 'Senior Secondary 1', group: 'SENIOR_SECONDARY', order: 10 },
  { code: 'SSS2', name: 'Senior Secondary 2', group: 'SENIOR_SECONDARY', order: 11 },
  { code: 'SSS3', name: 'Senior Secondary 3', group: 'SENIOR_SECONDARY', order: 12 },
  // International grade system (US/IB)
  { code: 'GRADE_1', name: 'Grade 1', group: 'INTL_GRADE', order: 1 },
  { code: 'GRADE_2', name: 'Grade 2', group: 'INTL_GRADE', order: 2 },
  { code: 'GRADE_3', name: 'Grade 3', group: 'INTL_GRADE', order: 3 },
  { code: 'GRADE_4', name: 'Grade 4', group: 'INTL_GRADE', order: 4 },
  { code: 'GRADE_5', name: 'Grade 5', group: 'INTL_GRADE', order: 5 },
  { code: 'GRADE_6', name: 'Grade 6', group: 'INTL_GRADE', order: 6 },
  { code: 'GRADE_7', name: 'Grade 7', group: 'INTL_GRADE', order: 7 },
  { code: 'GRADE_8', name: 'Grade 8', group: 'INTL_GRADE', order: 8 },
  { code: 'GRADE_9', name: 'Grade 9', group: 'INTL_GRADE', order: 9 },
  { code: 'GRADE_10', name: 'Grade 10', group: 'INTL_GRADE', order: 10 },
  { code: 'GRADE_11', name: 'Grade 11', group: 'INTL_GRADE', order: 11 },
  { code: 'GRADE_12', name: 'Grade 12', group: 'INTL_GRADE', order: 12 },
  // British / Cambridge pre-university
  { code: 'O_LEVEL', name: 'O Level', group: 'BRITISH', order: 1 },
  { code: 'A_LEVEL', name: 'A Level', group: 'BRITISH', order: 2 },
];

export async function seedCanonicalLevels(prisma: PrismaClient): Promise<SeedRunResult> {
  const startedAt = Date.now();
  let upserted = 0;
  for (const l of CANONICAL_LEVELS) {
    await prisma.canonicalLevel.upsert({
      where: { code: l.code },
      update: { name: l.name, group: l.group, order: l.order },
      create: { code: l.code, name: l.name, group: l.group, order: l.order, active: true },
    });
    upserted += 1;
  }
  return { upserted, skipped: 0, durationMs: Date.now() - startedAt };
}
