import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePopularExamDto,
  PopularExamQueryDto,
  UpdatePopularExamDto,
} from './dto';

@Injectable()
export class PopularExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PopularExamQueryDto) {
    const where: Prisma.PopularExamWhereInput = { deletedAt: null };
    if (query.active !== undefined) where.active = query.active;
    if (query.country) where.country = query.country;

    return this.prisma.popularExam.findMany({
      where,
      orderBy: [{ active: 'desc' }, { code: 'asc' }],
    });
  }

  async findById(id: string) {
    const exam = await this.prisma.popularExam.findFirst({
      where: { id, deletedAt: null },
    });
    if (!exam) throw new NotFoundException('Popular exam not found');
    return exam;
  }

  async create(dto: CreatePopularExamDto) {
    const existing = await this.prisma.popularExam.findFirst({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Popular exam with code '${dto.code}' already exists`,
      );
    }

    return this.prisma.popularExam.create({
      data: {
        code: dto.code,
        name: dto.name,
        country: dto.country,
        description: dto.description,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePopularExamDto) {
    await this.findById(id);

    return this.prisma.popularExam.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async softDelete(id: string) {
    await this.findById(id);

    const tagged = await this.prisma.questionPopularExam.count({
      where: { popularExamId: id },
    });
    if (tagged > 0) {
      throw new ConflictException(
        `Cannot delete: ${tagged} question(s) reference this exam. Deactivate it instead.`,
      );
    }

    await this.prisma.popularExam.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }
}
