import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  QuestionOwnerType,
  QuestionStatus,
  QuestionType,
  QuizStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { UserTypes } from '../users/constants';
import {
  CreateQuestionDto,
  QuestionOptionDto,
  QuestionPopularExamTagDto,
  QuestionQueryDto,
  UpdateQuestionDto,
} from './dto';

const QUESTION_INCLUDE = {
  options: true,
  topics: { include: { topic: true } },
  popularExams: { include: { popularExam: true } },
  _count: { select: { quizUses: true } },
} as const;

interface CallerContext {
  userId: string;
  type: string;
  schoolId: string | null;
}

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(callerUserId: string, scope: 'mine' | 'library', query: QuestionQueryDto) {
    const caller = await this.getCallerContext(callerUserId);

    const where: Prisma.QuestionWhereInput = { deletedAt: null };

    if (scope === 'mine') {
      if (caller.type !== UserTypes.TEACHER) {
        return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
      }
      where.ownerType = QuestionOwnerType.TEACHER_AUTHORED;
      where.schoolId = caller.schoolId;
      where.authorUserId = callerUserId;
    } else {
      where.ownerType = QuestionOwnerType.SCHOS_CURATED;
    }

    // Teachers only ever see PUBLISHED curated content; ignore any user-supplied status filter
    // when scoped to the library. System admins keep full visibility for library management.
    const teacherLibraryView = scope === 'library' && caller.type === UserTypes.TEACHER;
    if (teacherLibraryView) {
      where.status = QuestionStatus.PUBLISHED;
    }

    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.levelId) where.levelId = query.levelId;
    if (query.canonicalSubjectName) {
      where.canonicalSubjectName = { equals: query.canonicalSubjectName, mode: 'insensitive' };
    }
    if (query.canonicalLevelCode) {
      where.canonicalLevelCode = { equals: query.canonicalLevelCode, mode: 'insensitive' };
    }
    if (query.canonicalTermName) {
      where.canonicalTermName = { equals: query.canonicalTermName, mode: 'insensitive' };
    }
    if (query.type) where.type = query.type;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.status && !teacherLibraryView) where.status = query.status;
    if (query.search) {
      where.promptPlainText = { contains: query.search, mode: 'insensitive' };
    }
    if (query.topicIds?.length) {
      where.topics = { some: { topicId: { in: query.topicIds } } };
    }
    if (query.popularExamId || query.examYear !== undefined) {
      const examWhere: Prisma.QuestionPopularExamWhereInput = {};
      if (query.popularExamId) examWhere.popularExamId = query.popularExamId;
      if (query.examYear !== undefined) examWhere.examYear = query.examYear;
      where.popularExams = { some: examWhere };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: QUESTION_INCLUDE,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(callerUserId: string, id: string) {
    const caller = await this.getCallerContext(callerUserId);
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      include: QUESTION_INCLUDE,
    });
    if (!question) throw new NotFoundException('Question not found');

    const isCurated = question.ownerType === QuestionOwnerType.SCHOS_CURATED;
    const isOwn =
      question.ownerType === QuestionOwnerType.TEACHER_AUTHORED &&
      question.authorUserId === callerUserId &&
      question.schoolId === caller.schoolId;
    if (!isCurated && !isOwn) {
      throw new NotFoundException('Question not found');
    }
    // Teachers must not see DRAFT/ARCHIVED curated questions — only system admins can preview those.
    if (
      isCurated &&
      caller.type === UserTypes.TEACHER &&
      question.status !== QuestionStatus.PUBLISHED
    ) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async create(callerUserId: string, dto: CreateQuestionDto) {
    const caller = await this.getCallerContext(callerUserId);
    const { ownerType, schoolId } = this.resolveOwnership(caller);

    let canonicalSubjectName = dto.canonicalSubjectName ?? null;
    let canonicalLevelCode = dto.canonicalLevelCode ?? null;
    let canonicalTermName = dto.canonicalTermName ?? null;

    if (ownerType === QuestionOwnerType.TEACHER_AUTHORED) {
      if (!dto.subjectId || !dto.levelId) {
        throw new BadRequestException(
          'subjectId and levelId are required for teacher-authored questions',
        );
      }
      const refs = await this.fetchSchoolRefs(
        schoolId!,
        dto.subjectId,
        dto.levelId,
        dto.defaultTermId,
      );
      canonicalSubjectName ??= refs.subject.name;
      canonicalLevelCode ??= refs.level.code;
      canonicalTermName ??= refs.term?.name ?? null;
    } else {
      if (dto.subjectId || dto.levelId || dto.defaultTermId) {
        throw new BadRequestException(
          'Curated questions must not bind to a school subject/level/term — use canonical fields instead',
        );
      }
      if (!canonicalSubjectName || !canonicalLevelCode) {
        throw new BadRequestException(
          'Curated questions require canonicalSubjectName and canonicalLevelCode so they are filterable in the library',
        );
      }
    }

    this.validateTypeSpecific(dto.type, dto.options, dto.config, dto.partialCreditMode);
    if (dto.popularExams) this.assertUniquePopularExamPairs(dto.popularExams);

    const created = await this.prisma.$transaction(async (tx) => {
      const q = await tx.question.create({
        data: {
          ownerType,
          schoolId,
          authorUserId: callerUserId,
          subjectId: dto.subjectId ?? null,
          levelId: dto.levelId ?? null,
          defaultTermId: dto.defaultTermId ?? null,
          canonicalSubjectName,
          canonicalLevelCode,
          canonicalTermName,
          type: dto.type,
          prompt: dto.prompt as Prisma.InputJsonValue,
          promptPlainText: dto.promptPlainText,
          mediaUrls: dto.mediaUrls ?? [],
          explanation: (dto.explanation ?? null) as Prisma.InputJsonValue,
          weight: dto.weight ?? 1,
          difficulty: dto.difficulty,
          status: dto.status ?? QuestionStatus.DRAFT,
          config: (dto.config ?? null) as Prisma.InputJsonValue,
          partialCreditMode: dto.partialCreditMode,
        },
      });

      await this.replaceOptions(tx, q.id, dto.options);
      await this.replaceTopicTags(tx, q.id, dto.topicIds);
      await this.replacePopularExamTags(tx, q.id, dto.popularExams);

      return q;
    });

    return this.fetchById(created.id);
  }

  async update(callerUserId: string, id: string, dto: UpdateQuestionDto) {
    const existing = await this.findOwnedOrCurated(callerUserId, id);
    await this.assertEditable(existing.id, existing.status);

    if (dto.subjectId !== undefined || dto.levelId !== undefined || dto.defaultTermId !== undefined) {
      if (existing.ownerType === QuestionOwnerType.SCHOS_CURATED) {
        throw new BadRequestException(
          'Curated questions cannot bind to a school subject/level/term',
        );
      }
    }
    if (dto.subjectId && dto.levelId && existing.schoolId) {
      await this.assertSubjectAndLevelInSchool(dto.subjectId, dto.levelId, existing.schoolId);
    }

    const nextType = dto.type ?? existing.type;
    if (
      dto.type !== undefined ||
      dto.options !== undefined ||
      dto.config !== undefined ||
      dto.partialCreditMode !== undefined
    ) {
      this.validateTypeSpecific(
        nextType,
        dto.options ?? undefined,
        dto.config ?? (existing.config as Record<string, unknown> | null) ?? undefined,
        dto.partialCreditMode ?? existing.partialCreditMode ?? undefined,
      );
    }

    if (dto.popularExams) this.assertUniquePopularExamPairs(dto.popularExams);

    await this.prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.prompt !== undefined && { prompt: dto.prompt as Prisma.InputJsonValue }),
          ...(dto.promptPlainText !== undefined && { promptPlainText: dto.promptPlainText }),
          ...(dto.mediaUrls !== undefined && { mediaUrls: dto.mediaUrls }),
          ...(dto.explanation !== undefined && {
            explanation: dto.explanation as Prisma.InputJsonValue,
          }),
          ...(dto.weight !== undefined && { weight: dto.weight }),
          ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
          ...(dto.levelId !== undefined && { levelId: dto.levelId }),
          ...(dto.defaultTermId !== undefined && { defaultTermId: dto.defaultTermId }),
          ...(dto.canonicalSubjectName !== undefined && {
            canonicalSubjectName: dto.canonicalSubjectName,
          }),
          ...(dto.canonicalLevelCode !== undefined && {
            canonicalLevelCode: dto.canonicalLevelCode,
          }),
          ...(dto.canonicalTermName !== undefined && { canonicalTermName: dto.canonicalTermName }),
          ...(dto.config !== undefined && { config: dto.config as Prisma.InputJsonValue }),
          ...(dto.partialCreditMode !== undefined && {
            partialCreditMode: dto.partialCreditMode,
          }),
          version: { increment: 1 },
        },
      });

      if (dto.options !== undefined) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
        await this.replaceOptions(tx, id, dto.options);
      }
      if (dto.topicIds !== undefined) {
        await tx.questionTopic.deleteMany({ where: { questionId: id } });
        await this.replaceTopicTags(tx, id, dto.topicIds);
      }
      if (dto.popularExams !== undefined) {
        await tx.questionPopularExam.deleteMany({ where: { questionId: id } });
        await this.replacePopularExamTags(tx, id, dto.popularExams);
      }
    });

    return this.fetchById(id);
  }

  async softDelete(callerUserId: string, id: string) {
    const existing = await this.findOwnedOrCurated(callerUserId, id);

    const refCount = await this.prisma.quizQuestion.count({ where: { questionId: id } });
    if (refCount > 0) {
      throw new ConflictException(
        `Cannot archive: ${refCount} quiz(zes) reference this question. Detach it from those quizzes first.`,
      );
    }

    await this.prisma.question.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: QuestionStatus.ARCHIVED,
      },
    });
  }

  async clone(callerUserId: string, id: string) {
    const caller = await this.getCallerContext(callerUserId);
    if (caller.type !== UserTypes.TEACHER) {
      throw new ForbiddenException('Only teachers can clone curated questions');
    }
    if (!caller.schoolId) {
      throw new BadRequestException('Caller has no schoolId');
    }

    const source = await this.prisma.question.findFirst({
      where: {
        id,
        deletedAt: null,
        ownerType: QuestionOwnerType.SCHOS_CURATED,
        status: QuestionStatus.PUBLISHED,
      },
      include: QUESTION_INCLUDE,
    });
    if (!source) {
      throw new NotFoundException(
        'Curated question not found (only PUBLISHED curated questions can be cloned)',
      );
    }

    const cloned = await this.prisma.$transaction(async (tx) => {
      const q = await tx.question.create({
        data: {
          ownerType: QuestionOwnerType.TEACHER_AUTHORED,
          schoolId: caller.schoolId,
          authorUserId: callerUserId,
          subjectId: null,
          levelId: null,
          defaultTermId: null,
          canonicalSubjectName: source.canonicalSubjectName,
          canonicalLevelCode: source.canonicalLevelCode,
          canonicalTermName: source.canonicalTermName,
          type: source.type,
          prompt: source.prompt as Prisma.InputJsonValue,
          promptPlainText: source.promptPlainText,
          mediaUrls: source.mediaUrls,
          explanation: (source.explanation ?? null) as Prisma.InputJsonValue,
          weight: source.weight,
          difficulty: source.difficulty,
          status: QuestionStatus.DRAFT,
          sourceQuestionId: source.id,
          config: (source.config ?? null) as Prisma.InputJsonValue,
          partialCreditMode: source.partialCreditMode,
        },
      });

      if (source.options.length > 0) {
        await tx.questionOption.createMany({
          data: source.options.map((o) => ({
            questionId: q.id,
            order: o.order,
            label: o.label as Prisma.InputJsonValue,
            labelPlainText: o.labelPlainText,
            isCorrect: o.isCorrect,
            mediaUrl: o.mediaUrl,
          })),
        });
      }

      if (source.topics.length > 0) {
        await tx.questionTopic.createMany({
          data: source.topics.map((t) => ({ questionId: q.id, topicId: t.topicId })),
        });
      }

      if (source.popularExams.length > 0) {
        await tx.questionPopularExam.createMany({
          data: source.popularExams.map((p) => ({
            questionId: q.id,
            popularExamId: p.popularExamId,
            examYear: p.examYear,
            questionNumber: p.questionNumber,
          })),
        });
      }

      return q;
    });

    return this.fetchById(cloned.id);
  }

  // ---- internals ----

  private async fetchById(id: string) {
    const q = await this.prisma.question.findUnique({
      where: { id },
      include: QUESTION_INCLUDE,
    });
    if (!q) throw new NotFoundException('Question not found');
    return q;
  }

  private async findOwnedOrCurated(callerUserId: string, id: string) {
    const caller = await this.getCallerContext(callerUserId);
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });
    if (!question) throw new NotFoundException('Question not found');

    if (caller.type === UserTypes.TEACHER) {
      if (
        question.ownerType !== QuestionOwnerType.TEACHER_AUTHORED ||
        question.authorUserId !== callerUserId ||
        question.schoolId !== caller.schoolId
      ) {
        throw new ForbiddenException('You can only modify your own questions');
      }
    } else if (caller.type === UserTypes.SYSTEM_ADMIN) {
      if (question.ownerType !== QuestionOwnerType.SCHOS_CURATED) {
        throw new ForbiddenException('System admins can only modify curated questions');
      }
    } else {
      throw new ForbiddenException('Not authorized to modify questions');
    }

    return question;
  }

  private async assertEditable(questionId: string, status: QuestionStatus) {
    if (status !== QuestionStatus.PUBLISHED) return;

    const blockers = await this.prisma.quizQuestion.findMany({
      where: {
        questionId,
        quiz: { status: QuizStatus.PUBLISHED, deletedAt: null },
      },
      select: { quiz: { select: { id: true, title: true } } },
      take: 5,
    });
    if (blockers.length === 0) return;

    const titles = blockers.map((b) => `"${b.quiz.title}"`).join(', ');
    throw new ConflictException(
      `Cannot edit: question is in use by published quiz(zes) ${titles}. Clone it and edit the clone instead.`,
    );
  }

  private async getCallerContext(userId: string): Promise<CallerContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, type: true, schoolId: true },
    });
    if (!user) throw new ForbiddenException('Caller not found');
    return { userId: user.id, type: user.type, schoolId: user.schoolId };
  }

  private resolveOwnership(caller: CallerContext) {
    if (caller.type === UserTypes.TEACHER) {
      if (!caller.schoolId) {
        throw new BadRequestException('Teacher has no schoolId');
      }
      return { ownerType: QuestionOwnerType.TEACHER_AUTHORED, schoolId: caller.schoolId };
    }
    if (caller.type === UserTypes.SYSTEM_ADMIN) {
      return { ownerType: QuestionOwnerType.SCHOS_CURATED, schoolId: null as string | null };
    }
    throw new ForbiddenException('Only teachers and system admins can author questions');
  }

  private async fetchSchoolRefs(
    schoolId: string,
    subjectId: string,
    levelId: string,
    termId: string | undefined,
  ) {
    const [subject, level, term] = await Promise.all([
      this.prisma.subject.findFirst({
        where: { id: subjectId, schoolId, deletedAt: null },
        select: { id: true, name: true },
      }),
      this.prisma.level.findFirst({
        where: { id: levelId, schoolId, deletedAt: null },
        select: { id: true, code: true },
      }),
      termId
        ? this.prisma.term.findFirst({
            where: { id: termId, deletedAt: null },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]);
    if (!subject) throw new BadRequestException('Subject not found in your school');
    if (!level) throw new BadRequestException('Level not found in your school');
    if (termId && !term) throw new BadRequestException('Term not found');
    return { subject, level, term };
  }

  private async assertSubjectAndLevelInSchool(
    subjectId: string,
    levelId: string,
    schoolId: string,
  ) {
    await this.fetchSchoolRefs(schoolId, subjectId, levelId, undefined);
  }

  private validateTypeSpecific(
    type: QuestionType,
    options: QuestionOptionDto[] | undefined,
    config: Record<string, unknown> | null | undefined,
    partialCreditMode: unknown,
  ) {
    switch (type) {
      case QuestionType.MCQ_SINGLE: {
        if (!options || options.length < 2) {
          throw new BadRequestException('MCQ_SINGLE requires at least 2 options');
        }
        const correct = options.filter((o) => o.isCorrect).length;
        if (correct !== 1) {
          throw new BadRequestException('MCQ_SINGLE must have exactly one correct option');
        }
        return;
      }
      case QuestionType.MCQ_MULTI: {
        if (!options || options.length < 2) {
          throw new BadRequestException('MCQ_MULTI requires at least 2 options');
        }
        const correct = options.filter((o) => o.isCorrect).length;
        if (correct < 1) {
          throw new BadRequestException('MCQ_MULTI must have at least one correct option');
        }
        return;
      }
      case QuestionType.TRUE_FALSE: {
        if (options && options.length > 0) {
          throw new BadRequestException('TRUE_FALSE must not include options');
        }
        if (!config || typeof (config as { correctAnswer?: unknown }).correctAnswer !== 'boolean') {
          throw new BadRequestException('TRUE_FALSE requires config.correctAnswer (boolean)');
        }
        return;
      }
      case QuestionType.NUMERIC: {
        if (options && options.length > 0) {
          throw new BadRequestException('NUMERIC must not include options');
        }
        const c = (config ?? {}) as { correctAnswer?: unknown; tolerance?: unknown; toleranceMode?: unknown };
        if (typeof c.correctAnswer !== 'number') {
          throw new BadRequestException('NUMERIC requires config.correctAnswer (number)');
        }
        if (typeof c.tolerance !== 'number' || c.tolerance < 0) {
          throw new BadRequestException('NUMERIC requires config.tolerance (non-negative number)');
        }
        if (c.toleranceMode !== 'ABSOLUTE' && c.toleranceMode !== 'PERCENT') {
          throw new BadRequestException('NUMERIC requires config.toleranceMode of ABSOLUTE | PERCENT');
        }
        return;
      }
      case QuestionType.SHORT_ANSWER: {
        if (options && options.length > 0) {
          throw new BadRequestException('SHORT_ANSWER must not include options');
        }
        const c = (config ?? {}) as { acceptedAnswers?: unknown };
        if (
          !Array.isArray(c.acceptedAnswers) ||
          c.acceptedAnswers.length === 0 ||
          !c.acceptedAnswers.every((a) => typeof a === 'string')
        ) {
          throw new BadRequestException(
            'SHORT_ANSWER requires config.acceptedAnswers (non-empty string array)',
          );
        }
        return;
      }
      default:
        throw new BadRequestException(`Unsupported question type: ${type}`);
    }
  }

  private assertUniquePopularExamPairs(tags: QuestionPopularExamTagDto[]) {
    const seen = new Set<string>();
    for (const t of tags) {
      const key = `${t.popularExamId}:${t.examYear ?? 'null'}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate popular-exam tag for popularExamId=${t.popularExamId} examYear=${t.examYear ?? 'null'}`,
        );
      }
      seen.add(key);
    }
  }

  private async replaceOptions(
    tx: Prisma.TransactionClient,
    questionId: string,
    options: QuestionOptionDto[] | undefined,
  ) {
    if (!options?.length) return;
    await tx.questionOption.createMany({
      data: options.map((o) => ({
        questionId,
        order: o.order,
        label: o.label as Prisma.InputJsonValue,
        labelPlainText: o.labelPlainText,
        isCorrect: o.isCorrect,
        mediaUrl: o.mediaUrl,
      })),
    });
  }

  private async replaceTopicTags(
    tx: Prisma.TransactionClient,
    questionId: string,
    topicIds: string[] | undefined,
  ) {
    if (!topicIds?.length) return;
    await tx.questionTopic.createMany({
      data: topicIds.map((topicId) => ({ questionId, topicId })),
      skipDuplicates: true,
    });
  }

  private async replacePopularExamTags(
    tx: Prisma.TransactionClient,
    questionId: string,
    tags: QuestionPopularExamTagDto[] | undefined,
  ) {
    if (!tags?.length) return;
    await tx.questionPopularExam.createMany({
      data: tags.map((t) => ({
        questionId,
        popularExamId: t.popularExamId,
        examYear: t.examYear ?? null,
        questionNumber: t.questionNumber ?? null,
      })),
    });
  }
}
