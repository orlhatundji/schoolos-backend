import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  EquationLibraryItemResult,
  EquationLibraryListResult,
  EquationLibrarySubjectFacetResult,
} from './results/equation-library-list.result';

@Injectable()
export class EquationLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(opts: { subjectSlug?: string; q?: string }): Promise<EquationLibraryListResult> {
    const where: Prisma.EquationLibraryItemWhereInput = { isActive: true };
    if (opts.subjectSlug) {
      where.canonicalSubject = { slug: opts.subjectSlug };
    }
    if (opts.q && opts.q.trim().length > 0) {
      const term = opts.q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { tags: { has: term.toLowerCase() } },
      ];
    }

    const [rows, allSubjects] = await Promise.all([
      this.prisma.equationLibraryItem.findMany({
        where,
        include: {
          canonicalSubject: { select: { slug: true, name: true } },
        },
        orderBy: [{ canonicalSubject: { name: 'asc' } }, { order: 'asc' }, { name: 'asc' }],
      }),
      this.subjectFacets(opts.q),
    ]);

    const items: EquationLibraryItemResult[] = rows.map((r) => ({
      id: r.id,
      canonicalSubjectId: r.canonicalSubjectId,
      canonicalSubjectSlug: r.canonicalSubject.slug,
      canonicalSubjectName: r.canonicalSubject.name,
      name: r.name,
      description: r.description,
      latex: r.latex,
      tags: r.tags,
    }));

    return { items, subjects: allSubjects };
  }

  /**
   * Counts of active equations grouped by canonical subject. When `q` is set,
   * counts reflect rows matching the search term — so the dropdown badges
   * stay in sync with what the user is filtering by. Subjects with zero
   * matches are still included so the user can clear their search by
   * picking another subject.
   */
  private async subjectFacets(q?: string): Promise<EquationLibrarySubjectFacetResult[]> {
    const where: Prisma.EquationLibraryItemWhereInput = { isActive: true };
    if (q && q.trim().length > 0) {
      const term = q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { tags: { has: term.toLowerCase() } },
      ];
    }
    const grouped = await this.prisma.equationLibraryItem.groupBy({
      by: ['canonicalSubjectId'],
      where,
      _count: { _all: true },
    });
    const subjectIds = grouped.map((g) => g.canonicalSubjectId);
    const subjects = await this.prisma.canonicalSubject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, slug: true, name: true },
    });
    const subjectsById = new Map(subjects.map((s) => [s.id, s]));
    return grouped
      .map((g) => {
        const s = subjectsById.get(g.canonicalSubjectId);
        if (!s) return null;
        return { slug: s.slug, name: s.name, count: g._count._all };
      })
      .filter((x): x is EquationLibrarySubjectFacetResult => x !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
