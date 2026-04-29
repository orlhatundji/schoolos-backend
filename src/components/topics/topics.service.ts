import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateTopicDto, TopicQueryDto, UpdateTopicDto } from './dto';

@Injectable()
export class TopicsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: TopicQueryDto) {
    const where: Prisma.TopicWhereInput = {};

    if (!query.includeDeleted) where.deletedAt = null;

    if (query.canonicalSubjectName) {
      where.canonicalSubjectName = {
        equals: query.canonicalSubjectName,
        mode: 'insensitive',
      };
    }
    if (query.canonicalLevelCode) {
      where.canonicalLevelCode = {
        equals: query.canonicalLevelCode,
        mode: 'insensitive',
      };
    }

    if (query.parentTopicId !== undefined) {
      where.parentTopicId = query.parentTopicId === 'root' ? null : query.parentTopicId;
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    return this.prisma.topic.findMany({
      where,
      orderBy: [{ canonicalSubjectName: 'asc' }, { canonicalLevelCode: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const topic = await this.prisma.topic.findFirst({
      where: { id, deletedAt: null },
    });
    if (!topic) throw new NotFoundException('Topic not found');
    return topic;
  }

  async create(dto: CreateTopicDto) {
    const existingSlug = await this.prisma.topic.findUnique({ where: { slug: dto.slug } });
    if (existingSlug) {
      throw new ConflictException(`Topic with slug '${dto.slug}' already exists`);
    }

    if (dto.parentTopicId) {
      const parent = await this.findById(dto.parentTopicId);
      if (
        parent.canonicalSubjectName.toLowerCase() !== dto.canonicalSubjectName.toLowerCase() ||
        parent.canonicalLevelCode.toLowerCase() !== dto.canonicalLevelCode.toLowerCase()
      ) {
        throw new BadRequestException(
          'Subtopic must share parent\'s canonicalSubjectName and canonicalLevelCode',
        );
      }
    }

    return this.prisma.topic.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentTopicId: dto.parentTopicId,
        order: dto.order ?? 0,
        canonicalSubjectName: dto.canonicalSubjectName,
        canonicalLevelCode: dto.canonicalLevelCode,
      },
    });
  }

  async update(id: string, dto: UpdateTopicDto) {
    const existing = await this.findById(id);

    if (dto.parentTopicId !== undefined && dto.parentTopicId !== null) {
      if (dto.parentTopicId === id) {
        throw new BadRequestException('A topic cannot be its own parent');
      }
      const parent = await this.findById(dto.parentTopicId);
      if (
        parent.canonicalSubjectName.toLowerCase() !== existing.canonicalSubjectName.toLowerCase() ||
        parent.canonicalLevelCode.toLowerCase() !== existing.canonicalLevelCode.toLowerCase()
      ) {
        throw new BadRequestException(
          'New parent must share this topic\'s canonicalSubjectName and canonicalLevelCode',
        );
      }
      await this.assertNotDescendant(id, dto.parentTopicId);
    }

    return this.prisma.topic.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.parentTopicId !== undefined && { parentTopicId: dto.parentTopicId }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async softDelete(id: string) {
    await this.findById(id);

    const childCount = await this.prisma.topic.count({
      where: { parentTopicId: id, deletedAt: null },
    });
    if (childCount > 0) {
      throw new ConflictException(
        `Cannot delete: ${childCount} subtopic(s) exist. Delete or reparent them first.`,
      );
    }

    const [questionTagCount, quizTagCount] = await Promise.all([
      this.prisma.questionTopic.count({ where: { topicId: id } }),
      this.prisma.quizTopic.count({ where: { topicId: id } }),
    ]);
    const refs = questionTagCount + quizTagCount;
    if (refs > 0) {
      throw new ConflictException(
        `Cannot delete: topic is referenced by ${questionTagCount} question(s) and ${quizTagCount} quiz(zes).`,
      );
    }

    await this.prisma.topic.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Walk up from `candidateAncestorId` and ensure we never hit `id` — i.e.
   * setting candidateAncestorId as id's parent would NOT create a cycle.
   */
  private async assertNotDescendant(id: string, candidateAncestorId: string): Promise<void> {
    let cursor: string | null = candidateAncestorId;
    const seen = new Set<string>();
    while (cursor) {
      if (seen.has(cursor)) return;
      seen.add(cursor);
      if (cursor === id) {
        throw new BadRequestException(
          'Cannot move: candidate parent is a descendant of this topic (would create a cycle)',
        );
      }
      const next = await this.prisma.topic.findUnique({
        where: { id: cursor },
        select: { parentTopicId: true },
      });
      cursor = next?.parentTopicId ?? null;
    }
  }
}
