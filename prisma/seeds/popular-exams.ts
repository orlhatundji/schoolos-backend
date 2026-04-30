import { PrismaClient } from '@prisma/client';

import { SeedRunResult } from './types';

interface PopularExamSeed {
  code: string;
  name: string;
  country: string;
  description: string;
}

const POPULAR_EXAMS: ReadonlyArray<PopularExamSeed> = [
  { code: 'WAEC', name: 'West African Examinations Council', country: 'NG', description: 'Senior School Certificate Examination administered across West Africa.' },
  { code: 'NECO', name: 'National Examinations Council', country: 'NG', description: 'Nigerian senior secondary certificate examination.' },
  { code: 'JAMB', name: 'Joint Admissions and Matriculation Board', country: 'NG', description: 'Nigerian university matriculation examination (UTME).' },
  { code: 'NABTEB', name: 'National Business and Technical Examinations Board', country: 'NG', description: 'Nigerian technical and business education certificate.' },
  { code: 'BECE', name: 'Basic Education Certificate Examination', country: 'NG', description: 'Junior secondary school exit examination in Nigeria.' },
  { code: 'COMMON_ENTRANCE', name: 'National Common Entrance Examination', country: 'NG', description: 'Entry examination for federal unity colleges.' },
  { code: 'IGCSE', name: 'International General Certificate of Secondary Education', country: 'INTL', description: 'Cambridge international secondary qualification.' },
  { code: 'CHECKPOINT', name: 'Cambridge Lower Secondary Checkpoint', country: 'INTL', description: 'Cambridge end-of-stage assessment for lower secondary.' },
  { code: 'A_LEVELS', name: 'GCE Advanced Level', country: 'INTL', description: 'Cambridge / Edexcel pre-university qualification.' },
  { code: 'O_LEVELS', name: 'GCE Ordinary Level', country: 'INTL', description: 'Cambridge / Edexcel ordinary-level qualification.' },
  { code: 'SAT', name: 'Scholastic Assessment Test', country: 'INTL', description: 'College Board standardized university admissions test.' },
  { code: 'TOEFL', name: 'Test of English as a Foreign Language', country: 'INTL', description: 'English-language proficiency test for non-native speakers.' },
  { code: 'IELTS', name: 'International English Language Testing System', country: 'INTL', description: 'English-language proficiency test for study, work, migration.' },
];

export async function seedPopularExams(prisma: PrismaClient): Promise<SeedRunResult> {
  const startedAt = Date.now();
  let upserted = 0;
  for (const exam of POPULAR_EXAMS) {
    await prisma.popularExam.upsert({
      where: { code: exam.code },
      update: {
        name: exam.name,
        country: exam.country,
        description: exam.description,
      },
      create: {
        code: exam.code,
        name: exam.name,
        country: exam.country,
        description: exam.description,
        active: true,
      },
    });
    upserted += 1;
  }
  return { upserted, skipped: 0, durationMs: Date.now() - startedAt };
}
