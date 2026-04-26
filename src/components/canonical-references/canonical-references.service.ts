import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CanonicalReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  listSubjects(activeOnly = true) {
    return this.prisma.canonicalSubject.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly && { active: true }),
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  listLevels(activeOnly = true, group?: string) {
    return this.prisma.canonicalLevel.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly && { active: true }),
        ...(group && { group }),
      },
      orderBy: [{ group: 'asc' }, { order: 'asc' }],
    });
  }

  listTerms(activeOnly = true) {
    return this.prisma.canonicalTerm.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly && { active: true }),
      },
      orderBy: [{ order: 'asc' }],
    });
  }
}
