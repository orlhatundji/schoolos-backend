/**
 * Sample SCHOS_CURATED quizzes that bundle previously-seeded curated
 * questions into ready-to-publish quiz objects. Owned by the platform
 * (schoolId = null), authored by the bootstrap PLATFORM_ADMIN, status
 * DRAFT — staff review and publish via the platform-portal /quizzes UI
 * before they appear in /quizzes/library for teachers to clone.
 *
 * Idempotency: each quiz seed carries a stable `seedKey`. We anchor it
 * on the FIRST line of the `description` (mirrors the trick used for
 * curated-questions promptPlainText) and look up by that anchor on
 * re-runs. QuizQuestion rows are fully replaced on update so the linked
 * question set always matches the seed's `questionSeedKeys` list.
 *
 * Run order: this seed depends on `curated-questions` because it looks
 * up each linked question by the seedKey anchor inside its
 * promptPlainText. The SeedRunner UI surfaces the dependency.
 */

import {
  Prisma,
  PrismaClient,
  QuestionDifficulty,
  QuizOwnerType,
  QuizStatus,
} from '@prisma/client';

import { SeedRunResult } from './types';

interface QuizSeed {
  seedKey: string;
  title: string;
  shortDescription: string;
  instructions?: string;
  canonicalSubjectName: string;
  canonicalLevelCode: string;
  canonicalTermName?: string;
  estimatedMinutes: number;
  passMarkPercent: number;
  difficulty?: QuestionDifficulty;
  defaultSettings?: Record<string, unknown>;
  /**
   * Stable seed keys of the curated questions to bundle into this quiz, in
   * order. Each must match a row created by the `curated-questions` seed.
   */
  questionSeedKeys: string[];
}

const ANCHOR_PREFIX = '[seed:';
const QUESTION_ANCHOR_PREFIX = '[seed:';

function buildDescription(seedKey: string, shortDescription: string): string {
  // First line is a machine-readable anchor; everything below is human-facing.
  return `${ANCHOR_PREFIX}${seedKey}]\n${shortDescription}`;
}

const QUIZZES: QuizSeed[] = [
  {
    seedKey: 'eng-generic-quiz',
    title: 'Generic English Language Quiz',
    shortDescription:
      'A 20-question English Language quiz covering vocabulary, grammar, concord, voice, tense, punctuation, idiom and figurative language. WAEC/JAMB-flavoured at SSS level.',
    instructions:
      'Read each question carefully. Select the single best answer. You have 30 minutes. The pass mark is 50%.',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS3',
    estimatedMinutes: 30,
    passMarkPercent: 50,
    difficulty: QuestionDifficulty.MEDIUM,
    defaultSettings: {
      shuffleQuestions: true,
      shuffleOptions: true,
      showResultsImmediately: true,
      showCorrectAnswers: true,
    },
    questionSeedKeys: [
      'eng-tense',
      'eng-synonym',
      'eng-antonym-1',
      'eng-concord-1',
      'eng-concord-2',
      'eng-passive-1',
      'eng-active-1',
      'eng-tense-future',
      'eng-vocab-context',
      'eng-spelling-1',
      'eng-punct-1',
      'eng-reported-1',
      'eng-idiom-1',
      'eng-stress-1',
      'eng-comparative-1',
      'eng-prep-1',
      'eng-figure-speech-1',
      'eng-pronoun-1',
      'eng-conditional-1',
      'eng-phrase-meaning-1',
    ],
  },
];

async function findPlatformAdminUserId(prisma: PrismaClient): Promise<string | null> {
  const sa = await prisma.systemAdmin.findFirst({
    where: { role: 'PLATFORM_ADMIN' },
    select: { user: { select: { id: true } } },
  });
  return sa?.user?.id ?? null;
}

/**
 * Resolve question seedKeys to actual Question.id values by matching the
 * anchor line we wrote into promptPlainText in the curated-questions seed.
 * Returns a map keyed by seedKey; missing keys are silently absent so the
 * caller can decide whether to skip the quiz or fail loudly.
 */
async function resolveQuestionIds(
  prisma: PrismaClient,
  seedKeys: string[],
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const seedKey of seedKeys) {
    const anchor = `${QUESTION_ANCHOR_PREFIX}${seedKey}]`;
    const q = await prisma.question.findFirst({
      where: {
        ownerType: 'SCHOS_CURATED',
        deletedAt: null,
        promptPlainText: { startsWith: anchor },
      },
      select: { id: true },
    });
    if (q) found.set(seedKey, q.id);
  }
  return found;
}

export async function seedCuratedQuizzes(prisma: PrismaClient): Promise<SeedRunResult> {
  const startedAt = Date.now();
  const authorUserId = await findPlatformAdminUserId(prisma);
  if (!authorUserId) {
    return {
      upserted: 0,
      skipped: QUIZZES.length,
      durationMs: Date.now() - startedAt,
      notes:
        'Skipped — no PLATFORM_ADMIN user found. Run the main seed first to bootstrap the system admin.',
    };
  }

  let upserted = 0;
  let skipped = 0;
  const missingQuestionsByQuiz: Record<string, string[]> = {};

  for (const q of QUIZZES) {
    const idMap = await resolveQuestionIds(prisma, q.questionSeedKeys);
    const missing = q.questionSeedKeys.filter((k) => !idMap.has(k));
    if (missing.length > 0) {
      missingQuestionsByQuiz[q.seedKey] = missing;
    }
    if (idMap.size === 0) {
      // No questions resolved — the curated-questions seed hasn't been run.
      // Skip this quiz entirely; partial-resolution case below still creates
      // the quiz but flags the missing pieces in the notes.
      skipped += 1;
      continue;
    }

    const description = buildDescription(q.seedKey, q.shortDescription);
    const anchorLine = `${ANCHOR_PREFIX}${q.seedKey}]`;
    const existing = await prisma.quiz.findFirst({
      where: {
        ownerType: 'SCHOS_CURATED',
        deletedAt: null,
        description: { startsWith: anchorLine },
      },
      select: { id: true },
    });

    const sharedFields = {
      title: q.title,
      description,
      instructions: q.instructions ?? null,
      canonicalSubjectName: q.canonicalSubjectName,
      canonicalLevelCode: q.canonicalLevelCode,
      canonicalTermName: q.canonicalTermName ?? null,
      estimatedMinutes: q.estimatedMinutes,
      passMarkPercent: new Prisma.Decimal(q.passMarkPercent),
      difficulty: q.difficulty ?? null,
      defaultSettings: (q.defaultSettings as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      status: QuizStatus.DRAFT,
    };

    const orderedIds = q.questionSeedKeys
      .map((k) => idMap.get(k))
      .filter((id): id is string => Boolean(id));

    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.quiz.update({ where: { id: existing.id }, data: sharedFields });
        await tx.quizQuestion.deleteMany({ where: { quizId: existing.id } });
        await tx.quizQuestion.createMany({
          data: orderedIds.map((questionId, idx) => ({
            quizId: existing.id,
            questionId,
            order: idx,
          })),
        });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const created = await tx.quiz.create({
          data: {
            ...sharedFields,
            ownerType: QuizOwnerType.SCHOS_CURATED,
            schoolId: null,
            authorUserId,
          },
        });
        await tx.quizQuestion.createMany({
          data: orderedIds.map((questionId, idx) => ({
            quizId: created.id,
            questionId,
            order: idx,
          })),
        });
      });
    }
    upserted += 1;
  }

  const missingNotes = Object.entries(missingQuestionsByQuiz)
    .map(([k, ids]) => `${k}: missing ${ids.join(', ')}`)
    .join('; ');

  return {
    upserted,
    skipped,
    durationMs: Date.now() - startedAt,
    notes:
      missingNotes.length > 0
        ? `Some questions were not yet seeded — run curated-questions first. (${missingNotes})`
        : 'Quizzes created/updated as DRAFT. Review and publish via /quizzes before they appear in the curated library for teachers.',
  };
}
