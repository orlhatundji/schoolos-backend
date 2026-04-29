import { PrismaClient } from '@prisma/client';

import { SeedRunResult } from './types';

interface CanonicalTermSeed {
  name: string;
  order: number;
}

const CANONICAL_TERMS: ReadonlyArray<CanonicalTermSeed> = [
  { name: 'First Term', order: 1 },
  { name: 'Second Term', order: 2 },
  { name: 'Third Term', order: 3 },
];

export async function seedCanonicalTerms(prisma: PrismaClient): Promise<SeedRunResult> {
  const startedAt = Date.now();
  let upserted = 0;
  for (const t of CANONICAL_TERMS) {
    await prisma.canonicalTerm.upsert({
      where: { name: t.name },
      update: { order: t.order },
      create: { name: t.name, order: t.order, active: true },
    });
    upserted += 1;
  }
  return { upserted, skipped: 0, durationMs: Date.now() - startedAt };
}
