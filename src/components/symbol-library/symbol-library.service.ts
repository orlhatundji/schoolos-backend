import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  SymbolCategoryFacetResult,
  SymbolLibraryItemResult,
  SymbolLibraryListResult,
} from './results/symbol-library-list.result';

@Injectable()
export class SymbolLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(opts: { category?: string; q?: string }): Promise<SymbolLibraryListResult> {
    const where: Prisma.SymbolLibraryItemWhereInput = { isActive: true };
    if (opts.category) where.category = opts.category;
    if (opts.q && opts.q.trim().length > 0) {
      const term = opts.q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { tags: { has: term.toLowerCase() } },
      ];
    }

    const [rows, categoryFacets] = await Promise.all([
      this.prisma.symbolLibraryItem.findMany({
        where,
        orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      }),
      this.categoryFacets(opts.q),
    ]);

    const items: SymbolLibraryItemResult[] = rows.map((r) => ({
      id: r.id,
      category: r.category,
      name: r.name,
      latex: r.latex,
      tags: r.tags,
    }));

    return { items, categories: categoryFacets };
  }

  private async categoryFacets(q?: string): Promise<SymbolCategoryFacetResult[]> {
    const where: Prisma.SymbolLibraryItemWhereInput = { isActive: true };
    if (q && q.trim().length > 0) {
      const term = q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { tags: { has: term.toLowerCase() } },
      ];
    }
    const grouped = await this.prisma.symbolLibraryItem.groupBy({
      by: ['category'],
      where,
      _count: { _all: true },
    });
    return grouped
      .map((g) => ({ category: g.category, count: g._count._all }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }
}
