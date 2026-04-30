import { PrismaClient } from '@prisma/client';

import { SeedRunResult } from './types';

interface CanonicalSubjectSeed {
  name: string;
  slug: string;
  description?: string;
}

const CANONICAL_SUBJECTS: ReadonlyArray<CanonicalSubjectSeed> = [
  { name: 'Mathematics', slug: 'mathematics' },
  { name: 'Further Mathematics', slug: 'further-mathematics' },
  { name: 'English Language', slug: 'english-language' },
  { name: 'Literature in English', slug: 'literature-in-english' },
  { name: 'Physics', slug: 'physics' },
  { name: 'Chemistry', slug: 'chemistry' },
  { name: 'Biology', slug: 'biology' },
  { name: 'Agricultural Science', slug: 'agricultural-science' },
  { name: 'Geography', slug: 'geography' },
  { name: 'Economics', slug: 'economics' },
  { name: 'Government', slug: 'government' },
  { name: 'History', slug: 'history' },
  { name: 'Civic Education', slug: 'civic-education' },
  { name: 'Christian Religious Studies', slug: 'christian-religious-studies' },
  { name: 'Islamic Religious Studies', slug: 'islamic-religious-studies' },
  { name: 'Commerce', slug: 'commerce' },
  { name: 'Financial Accounting', slug: 'financial-accounting' },
  { name: 'Business Studies', slug: 'business-studies' },
  { name: 'Office Practice', slug: 'office-practice' },
  { name: 'Marketing', slug: 'marketing' },
  { name: 'Computer Science', slug: 'computer-science' },
  { name: 'Information Communication Technology', slug: 'ict' },
  { name: 'Basic Science', slug: 'basic-science' },
  { name: 'Basic Technology', slug: 'basic-technology' },
  { name: 'Social Studies', slug: 'social-studies' },
  { name: 'Cultural and Creative Arts', slug: 'cultural-and-creative-arts' },
  { name: 'Visual Arts', slug: 'visual-arts' },
  { name: 'Music', slug: 'music' },
  { name: 'Home Economics', slug: 'home-economics' },
  { name: 'Food and Nutrition', slug: 'food-and-nutrition' },
  { name: 'Physical and Health Education', slug: 'physical-and-health-education' },
  { name: 'French', slug: 'french' },
  { name: 'Yoruba', slug: 'yoruba' },
  { name: 'Igbo', slug: 'igbo' },
  { name: 'Hausa', slug: 'hausa' },
  { name: 'Verbal Reasoning', slug: 'verbal-reasoning' },
  { name: 'Quantitative Reasoning', slug: 'quantitative-reasoning' },
  // Test-prep / cross-cutting
  {
    name: 'General Knowledge',
    slug: 'general-knowledge',
    description:
      'Current affairs, civic facts and broad-knowledge questions used for entrance and aptitude tests.',
  },
  { name: 'Data Processing', slug: 'data-processing' },
  // Technical / vocational (WAEC paper subjects)
  { name: 'Technical Drawing', slug: 'technical-drawing' },
  { name: 'Auto Mechanics', slug: 'auto-mechanics' },
  { name: 'Building Construction', slug: 'building-construction' },
  { name: 'Electrical Installation and Maintenance Work', slug: 'electrical-installation' },
  { name: 'Animal Husbandry', slug: 'animal-husbandry' },
  { name: 'Book Keeping', slug: 'book-keeping' },
  { name: 'Catering Craft Practice', slug: 'catering-craft-practice' },
  { name: 'Garment Making', slug: 'garment-making' },
  { name: 'Tie and Dye', slug: 'tie-and-dye' },
];

export async function seedCanonicalSubjects(prisma: PrismaClient): Promise<SeedRunResult> {
  const startedAt = Date.now();
  let upserted = 0;
  for (const s of CANONICAL_SUBJECTS) {
    await prisma.canonicalSubject.upsert({
      where: { slug: s.slug },
      update: { name: s.name, description: s.description },
      create: { name: s.name, slug: s.slug, description: s.description, active: true },
    });
    upserted += 1;
  }
  return { upserted, skipped: 0, durationMs: Date.now() - startedAt };
}
