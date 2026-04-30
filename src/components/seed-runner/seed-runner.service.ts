import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, SeedRunStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { seedCanonicalLevels } from '../../../prisma/seeds/canonical-levels';
import { seedCanonicalSubjects } from '../../../prisma/seeds/canonical-subjects';
import { seedCanonicalTerms } from '../../../prisma/seeds/canonical-terms';
import { seedCuratedQuestions } from '../../../prisma/seeds/curated-questions';
import { seedCuratedQuizzes } from '../../../prisma/seeds/curated-quizzes';
import { seedEquationLibrary } from '../../../prisma/seeds/equation-library';
import { seedPopularExams } from '../../../prisma/seeds/popular-exams';
import { seedSymbolLibrary } from '../../../prisma/seeds/symbol-library';
import type { SeedRunResult, SeedSlug } from '../../../prisma/seeds/types';

interface SeedDescriptor {
  slug: SeedSlug;
  title: string;
  description: string;
  /**
   * Slugs whose seeds should be run first because this seed depends on rows
   * they create. Used purely for documentation in the UI; the seed runner
   * never auto-chains, so the platform admin can see the order at a glance.
   */
  dependsOn: SeedSlug[];
  run: (prisma: PrismaClient) => Promise<SeedRunResult>;
}

/**
 * The full set of seeds the platform-portal seed-runner exposes. Order
 * here is the recommended execution order; UI renders cards top-to-bottom.
 *
 * Adding a new seed: add a line here AND a `'new-slug'` entry to the
 * `SeedSlug` union in prisma/seeds/types.ts.
 */
const SEEDS: SeedDescriptor[] = [
  {
    slug: 'canonical-subjects',
    title: 'Canonical Subjects',
    description:
      'Platform-wide subject reference list (Mathematics, Physics, etc). Curated questions, equations and symbols are keyed by subject slug.',
    dependsOn: [],
    run: seedCanonicalSubjects,
  },
  {
    slug: 'canonical-levels',
    title: 'Canonical Levels',
    description:
      'Platform-wide level / grade codes (PRY1-PRY6, JSS1-SSS3, GRADE_1-12, A_LEVEL, O_LEVEL).',
    dependsOn: [],
    run: seedCanonicalLevels,
  },
  {
    slug: 'canonical-terms',
    title: 'Canonical Terms',
    description: 'Platform-wide term names (First Term, Second Term, Third Term).',
    dependsOn: [],
    run: seedCanonicalTerms,
  },
  {
    slug: 'popular-exams',
    title: 'Popular Exams',
    description:
      'Reference list of standardized exams (WAEC, NECO, JAMB, IGCSE, etc) teachers tag past-paper questions with.',
    dependsOn: [],
    run: seedPopularExams,
  },
  {
    slug: 'equation-library',
    title: 'Equation Library',
    description:
      'Curated equations teachers pick from in the Insert math dialog. Subject-keyed; requires Canonical Subjects to be seeded first.',
    dependsOn: ['canonical-subjects'],
    run: seedEquationLibrary,
  },
  {
    slug: 'symbol-library',
    title: 'Symbol Library',
    description:
      'Curated math symbols (Greek letters, operators, calculus, sets, arrows). Inserted at the cursor in the math dialog.',
    dependsOn: [],
    run: seedSymbolLibrary,
  },
  {
    slug: 'curated-questions',
    title: 'Curated Sample Questions',
    description:
      'Starter SCHOS_CURATED questions across subjects, seeded as DRAFT for review. Requires the platform admin user to exist.',
    dependsOn: ['canonical-subjects', 'canonical-levels'],
    run: seedCuratedQuestions,
  },
  {
    slug: 'curated-quizzes',
    title: 'Curated Sample Quizzes',
    description:
      'Bundles curated questions into ready-to-publish quizzes (e.g. the generic English Language quiz). Seeded as DRAFT — review and publish before they appear in the curated quiz library.',
    dependsOn: ['canonical-subjects', 'canonical-levels', 'curated-questions'],
    run: seedCuratedQuizzes,
  },
];

const SEEDS_BY_SLUG = new Map(SEEDS.map((s) => [s.slug, s]));

@Injectable()
export class SeedRunnerService {
  constructor(private readonly prisma: PrismaService) {}

  /** In-memory mutex set: prevents concurrent runs of the same seed. */
  private readonly inFlight = new Set<SeedSlug>();

  list() {
    return Promise.all(
      SEEDS.map(async (s) => {
        const lastRun = await this.prisma.seedRun.findFirst({
          where: { seedSlug: s.slug },
          orderBy: { startedAt: 'desc' },
          include: {
            triggeredBy: { select: { firstName: true, lastName: true } },
          },
        });
        return {
          slug: s.slug,
          title: s.title,
          description: s.description,
          dependsOn: s.dependsOn,
          isRunning: this.inFlight.has(s.slug),
          lastRun: lastRun
            ? {
                id: lastRun.id,
                status: lastRun.status,
                startedAt: lastRun.startedAt,
                finishedAt: lastRun.finishedAt,
                upserted: lastRun.upserted,
                skipped: lastRun.skipped,
                durationMs: lastRun.durationMs,
                notes: lastRun.notes,
                errorMessage: lastRun.errorMessage,
                triggeredByName: lastRun.triggeredBy
                  ? `${lastRun.triggeredBy.firstName} ${lastRun.triggeredBy.lastName}`.trim()
                  : null,
              }
            : null,
        };
      }),
    );
  }

  async run(slug: string, triggeredById: string) {
    const seed = SEEDS_BY_SLUG.get(slug as SeedSlug);
    if (!seed) {
      throw new NotFoundException(`Unknown seed: ${slug}`);
    }
    if (this.inFlight.has(seed.slug)) {
      throw new ConflictException(`Seed "${seed.slug}" is already running.`);
    }

    this.inFlight.add(seed.slug);
    const audit = await this.prisma.seedRun.create({
      data: {
        seedSlug: seed.slug,
        status: SeedRunStatus.RUNNING,
        triggeredById,
      },
    });

    try {
      const result = await seed.run(this.prisma);
      const finishedAt = new Date();
      const updated = await this.prisma.seedRun.update({
        where: { id: audit.id },
        data: {
          status: SeedRunStatus.SUCCEEDED,
          finishedAt,
          upserted: result.upserted,
          skipped: result.skipped,
          durationMs: result.durationMs,
          notes: result.notes ?? null,
        },
      });
      return updated;
    } catch (err) {
      const finishedAt = new Date();
      await this.prisma.seedRun.update({
        where: { id: audit.id },
        data: {
          status: SeedRunStatus.FAILED,
          finishedAt,
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    } finally {
      this.inFlight.delete(seed.slug);
    }
  }
}
