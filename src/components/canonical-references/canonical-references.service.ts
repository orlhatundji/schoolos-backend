import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

interface SubjectInput {
  name: string;
  slug?: string;
  description?: string | null;
  active?: boolean;
}

interface LevelInput {
  code: string;
  name: string;
  group: string;
  order: number;
  active?: boolean;
}

interface TermInput {
  name: string;
  order: number;
  active?: boolean;
}

@Injectable()
export class CanonicalReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Subjects ----------

  listSubjects(activeOnly = true) {
    return this.prisma.canonicalSubject.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly && { active: true }),
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  async createSubject(dto: SubjectInput) {
    if (!dto.name?.trim()) throw new BadRequestException('name is required');
    const slug = (dto.slug ?? this.slugify(dto.name)).trim();
    if (!slug) throw new BadRequestException('slug is required');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException('slug must be lowercase alphanumeric with hyphens');
    }
    try {
      return await this.prisma.canonicalSubject.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description ?? null,
          active: dto.active ?? true,
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'subject');
    }
  }

  async updateSubject(id: string, dto: Partial<SubjectInput>) {
    await this.findSubjectOrThrow(id);
    try {
      return await this.prisma.canonicalSubject.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.slug !== undefined && { slug: dto.slug.trim() }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'subject');
    }
  }

  async deleteSubject(id: string) {
    await this.findSubjectOrThrow(id);
    return this.prisma.canonicalSubject.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  private async findSubjectOrThrow(id: string) {
    const s = await this.prisma.canonicalSubject.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Canonical subject not found');
    return s;
  }

  // ---------- Levels ----------

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

  async createLevel(dto: LevelInput) {
    const code = dto.code?.trim().toUpperCase();
    if (!code) throw new BadRequestException('code is required');
    if (!dto.name?.trim()) throw new BadRequestException('name is required');
    if (!dto.group?.trim()) throw new BadRequestException('group is required');
    try {
      return await this.prisma.canonicalLevel.create({
        data: {
          code,
          name: dto.name.trim(),
          group: dto.group.trim().toUpperCase(),
          order: dto.order,
          active: dto.active ?? true,
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'level');
    }
  }

  async updateLevel(id: string, dto: Partial<LevelInput>) {
    await this.findLevelOrThrow(id);
    try {
      return await this.prisma.canonicalLevel.update({
        where: { id },
        data: {
          ...(dto.code !== undefined && { code: dto.code.trim().toUpperCase() }),
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.group !== undefined && { group: dto.group.trim().toUpperCase() }),
          ...(dto.order !== undefined && { order: dto.order }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'level');
    }
  }

  async deleteLevel(id: string) {
    await this.findLevelOrThrow(id);
    return this.prisma.canonicalLevel.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  private async findLevelOrThrow(id: string) {
    const l = await this.prisma.canonicalLevel.findFirst({ where: { id, deletedAt: null } });
    if (!l) throw new NotFoundException('Canonical level not found');
    return l;
  }

  // ---------- Terms ----------

  listTerms(activeOnly = true) {
    return this.prisma.canonicalTerm.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly && { active: true }),
      },
      orderBy: [{ order: 'asc' }],
    });
  }

  async createTerm(dto: TermInput) {
    if (!dto.name?.trim()) throw new BadRequestException('name is required');
    try {
      return await this.prisma.canonicalTerm.create({
        data: {
          name: dto.name.trim(),
          order: dto.order,
          active: dto.active ?? true,
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'term');
    }
  }

  async updateTerm(id: string, dto: Partial<TermInput>) {
    await this.findTermOrThrow(id);
    try {
      return await this.prisma.canonicalTerm.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.order !== undefined && { order: dto.order }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'term');
    }
  }

  async deleteTerm(id: string) {
    await this.findTermOrThrow(id);
    return this.prisma.canonicalTerm.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  private async findTermOrThrow(id: string) {
    const t = await this.prisma.canonicalTerm.findFirst({ where: { id, deletedAt: null } });
    if (!t) throw new NotFoundException('Canonical term not found');
    return t;
  }

  // ---------- helpers ----------

  private slugify(s: string) {
    return s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private translateUniqueViolation(err: unknown, label: string): Error {
    const e = err as { code?: string; meta?: { target?: string[] } };
    if (e?.code === 'P2002') {
      const field = e.meta?.target?.join(', ') ?? 'name/slug/code';
      return new ConflictException(`A ${label} with this ${field} already exists`);
    }
    return err as Error;
  }
}
