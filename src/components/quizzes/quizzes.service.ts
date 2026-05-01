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
  QuizAssignmentStatus,
  QuizOwnerType,
  QuizStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { UserTypes } from '../users/constants';
import {
  AttachQuestionsDto,
  CreateQuizDto,
  QuizQueryDto,
  ReorderQuestionsDto,
  UpdateQuizDto,
} from './dto';

const QUESTION_INCLUDE = {
  options: true,
  topics: { include: { topic: true } },
  popularExams: { include: { popularExam: true } },
  _count: { select: { quizUses: true } },
} as const;

const QUIZ_DETAIL_INCLUDE = {
  topics: { include: { topic: true } },
  questions: {
    include: { question: { include: QUESTION_INCLUDE } },
    orderBy: { order: 'asc' },
  },
  _count: { select: { questions: true, assignments: true } },
} as const satisfies Prisma.QuizInclude;

const QUIZ_SUMMARY_INCLUDE = {
  topics: { include: { topic: true } },
  questions: {
    select: {
      weightOverride: true,
      question: { select: { weight: true } },
    },
  },
  _count: { select: { questions: true, assignments: true } },
} as const satisfies Prisma.QuizInclude;

interface CallerContext {
  userId: string;
  type: string;
  schoolId: string | null;
}

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(callerUserId: string, scope: 'mine' | 'library', query: QuizQueryDto) {
    const caller = await this.getCallerContext(callerUserId);

    const where: Prisma.QuizWhereInput = { deletedAt: null };

    if (scope === 'mine') {
      if (caller.type !== UserTypes.TEACHER) {
        return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
      }
      where.ownerType = QuizOwnerType.TEACHER_AUTHORED;
      where.schoolId = caller.schoolId;
      where.authorUserId = callerUserId;
    } else {
      where.ownerType = QuizOwnerType.SCHOS_CURATED;
    }

    // Teachers only ever see PUBLISHED curated content; ignore any user-supplied status filter
    // when scoped to the library. System admins keep full visibility for library management.
    const teacherLibraryView = scope === 'library' && caller.type === UserTypes.TEACHER;
    if (teacherLibraryView) {
      where.status = QuizStatus.PUBLISHED;
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
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.status && !teacherLibraryView) where.status = query.status;
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    if (query.topicIds?.length) {
      where.topics = { some: { topicId: { in: query.topicIds } } };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        include: QUIZ_SUMMARY_INCLUDE,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(callerUserId: string, id: string) {
    const caller = await this.getCallerContext(callerUserId);
    const quiz = await this.prisma.quiz.findFirst({
      where: { id, deletedAt: null },
      include: QUIZ_DETAIL_INCLUDE,
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const isCurated = quiz.ownerType === QuizOwnerType.SCHOS_CURATED;
    const isOwn =
      quiz.ownerType === QuizOwnerType.TEACHER_AUTHORED &&
      quiz.authorUserId === callerUserId &&
      quiz.schoolId === caller.schoolId;
    if (!isCurated && !isOwn) {
      throw new NotFoundException('Quiz not found');
    }
    // Teachers must not see DRAFT/ARCHIVED curated quizzes — only system admins can preview those.
    if (
      isCurated &&
      caller.type === UserTypes.TEACHER &&
      quiz.status !== QuizStatus.PUBLISHED
    ) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async create(callerUserId: string, dto: CreateQuizDto) {
    const caller = await this.getCallerContext(callerUserId);
    const { ownerType, schoolId } = this.resolveOwnership(caller);

    let canonicalSubjectName = dto.canonicalSubjectName ?? null;
    let canonicalLevelCode = dto.canonicalLevelCode ?? null;
    let canonicalTermName = dto.canonicalTermName ?? null;

    if (ownerType === QuizOwnerType.TEACHER_AUTHORED) {
      if (!dto.subjectId || !dto.levelId) {
        throw new BadRequestException(
          'subjectId and levelId are required for teacher-authored quizzes',
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
          'Curated quizzes must not bind to a school subject/level/term — use canonical fields instead',
        );
      }
      if (!canonicalSubjectName || !canonicalLevelCode) {
        throw new BadRequestException(
          'Curated quizzes require canonicalSubjectName and canonicalLevelCode so they are filterable in the library',
        );
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          ownerType,
          schoolId,
          authorUserId: callerUserId,
          title: dto.title,
          description: dto.description,
          instructions: dto.instructions,
          subjectId: dto.subjectId ?? null,
          levelId: dto.levelId ?? null,
          defaultTermId: dto.defaultTermId ?? null,
          canonicalSubjectName,
          canonicalLevelCode,
          canonicalTermName,
          status: dto.status ?? QuizStatus.DRAFT,
          estimatedMinutes: dto.estimatedMinutes,
          passMarkPercent: dto.passMarkPercent,
          difficulty: dto.difficulty,
          defaultSettings: (dto.defaultSettings ?? null) as Prisma.InputJsonValue,
        },
      });
      await this.replaceTopicTags(tx, quiz.id, dto.topicIds);
      return quiz;
    });

    return this.fetchById(created.id);
  }

  async update(callerUserId: string, id: string, dto: UpdateQuizDto) {
    const existing = await this.findOwnedOrCurated(callerUserId, id);

    if (dto.subjectId !== undefined || dto.levelId !== undefined || dto.defaultTermId !== undefined) {
      if (existing.ownerType === QuizOwnerType.SCHOS_CURATED) {
        throw new BadRequestException('Curated quizzes cannot bind to a school subject/level/term');
      }
    }
    if (dto.subjectId && dto.levelId && existing.schoolId) {
      await this.fetchSchoolRefs(existing.schoolId, dto.subjectId, dto.levelId, dto.defaultTermId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.instructions !== undefined && { instructions: dto.instructions }),
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
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.estimatedMinutes !== undefined && { estimatedMinutes: dto.estimatedMinutes }),
          ...(dto.passMarkPercent !== undefined && { passMarkPercent: dto.passMarkPercent }),
          ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
          ...(dto.defaultSettings !== undefined && {
            defaultSettings: dto.defaultSettings as Prisma.InputJsonValue,
          }),
          version: { increment: 1 },
        },
      });
      if (dto.topicIds !== undefined) {
        await tx.quizTopic.deleteMany({ where: { quizId: id } });
        await this.replaceTopicTags(tx, id, dto.topicIds);
      }
    });

    return this.fetchById(id);
  }

  async softDelete(callerUserId: string, id: string) {
    await this.findOwnedOrCurated(callerUserId, id);

    const activeAssignments = await this.prisma.quizAssignment.count({
      where: {
        quizId: id,
        deletedAt: null,
        status: { not: QuizAssignmentStatus.ARCHIVED },
      },
    });
    if (activeAssignments > 0) {
      throw new ConflictException(
        `Cannot archive: ${activeAssignments} non-archived assignment(s) still reference this quiz. Close them first.`,
      );
    }

    await this.prisma.quiz.update({
      where: { id },
      data: { deletedAt: new Date(), status: QuizStatus.ARCHIVED },
    });
  }

  async clone(callerUserId: string, id: string) {
    const caller = await this.getCallerContext(callerUserId);
    if (caller.type !== UserTypes.TEACHER) {
      throw new ForbiddenException('Only teachers can clone curated quizzes');
    }
    if (!caller.schoolId) {
      throw new BadRequestException('Caller has no schoolId');
    }

    const source = await this.prisma.quiz.findFirst({
      where: {
        id,
        deletedAt: null,
        ownerType: QuizOwnerType.SCHOS_CURATED,
        status: QuizStatus.PUBLISHED,
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
        topics: true,
      },
    });
    if (!source) {
      throw new NotFoundException(
        'Curated quiz not found (only PUBLISHED curated quizzes can be cloned)',
      );
    }

    const cloned = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quiz.create({
        data: {
          ownerType: QuizOwnerType.TEACHER_AUTHORED,
          schoolId: caller.schoolId,
          authorUserId: callerUserId,
          title: `${source.title} (copy)`,
          description: source.description,
          instructions: source.instructions,
          subjectId: null,
          levelId: null,
          defaultTermId: null,
          canonicalSubjectName: source.canonicalSubjectName,
          canonicalLevelCode: source.canonicalLevelCode,
          canonicalTermName: source.canonicalTermName,
          status: QuizStatus.DRAFT,
          estimatedMinutes: source.estimatedMinutes,
          passMarkPercent: source.passMarkPercent,
          difficulty: source.difficulty,
          defaultSettings: (source.defaultSettings ?? null) as Prisma.InputJsonValue,
          sourceQuizId: source.id,
        },
      });

      if (source.questions.length > 0) {
        await tx.quizQuestion.createMany({
          data: source.questions.map((qq) => ({
            quizId: q.id,
            questionId: qq.questionId,
            order: qq.order,
            weightOverride: qq.weightOverride,
          })),
        });
      }

      if (source.topics.length > 0) {
        await tx.quizTopic.createMany({
          data: source.topics.map((t) => ({ quizId: q.id, topicId: t.topicId })),
        });
      }

      return q;
    });

    return this.fetchById(cloned.id);
  }

  async attachQuestions(callerUserId: string, quizId: string, dto: AttachQuestionsDto) {
    const quiz = await this.findOwnedOrCurated(callerUserId, quizId);

    const questionIds = dto.questions.map((q) => q.questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      throw new BadRequestException('Duplicate questionIds in payload');
    }

    const existingAttachments = await this.prisma.quizQuestion.findMany({
      where: { quizId, questionId: { in: questionIds } },
      select: { questionId: true },
    });
    if (existingAttachments.length > 0) {
      throw new ConflictException(
        `Question(s) already attached: ${existingAttachments.map((e) => e.questionId).join(', ')}`,
      );
    }

    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds }, deletedAt: null },
      select: {
        id: true,
        ownerType: true,
        schoolId: true,
        authorUserId: true,
        status: true,
      },
    });
    if (questions.length !== questionIds.length) {
      const found = new Set(questions.map((q) => q.id));
      const missing = questionIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Question(s) not found: ${missing.join(', ')}`);
    }
    const caller = await this.getCallerContext(callerUserId);
    for (const q of questions) {
      const isCurated = q.ownerType === QuestionOwnerType.SCHOS_CURATED;
      const isOwnTeacherQuestion =
        q.ownerType === QuestionOwnerType.TEACHER_AUTHORED &&
        q.authorUserId === callerUserId &&
        q.schoolId === caller.schoolId;
      if (!isCurated && !isOwnTeacherQuestion) {
        throw new ForbiddenException(
          `Cannot attach question ${q.id}: not curated and not owned by you`,
        );
      }
      // Teachers can only pull PUBLISHED curated questions from the library; DRAFT/ARCHIVED
      // curated content is invisible to them. System admins composing curated quizzes are unrestricted.
      if (
        isCurated &&
        caller.type === UserTypes.TEACHER &&
        q.status !== QuestionStatus.PUBLISHED
      ) {
        throw new NotFoundException(`Question ${q.id} not found`);
      }
      if (quiz.ownerType === QuizOwnerType.SCHOS_CURATED && !isCurated) {
        throw new BadRequestException(
          `Curated quizzes can only contain curated questions; question ${q.id} is teacher-authored`,
        );
      }
    }

    const last = await this.prisma.quizQuestion.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    let nextOrder = (last?.order ?? -1) + 1;

    await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.questions) {
        await tx.quizQuestion.create({
          data: {
            quizId,
            questionId: entry.questionId,
            order: entry.order ?? nextOrder++,
            weightOverride: entry.weightOverride,
          },
        });
      }
      await tx.quiz.update({
        where: { id: quizId },
        data: { version: { increment: 1 } },
      });
    });

    return this.fetchById(quizId);
  }

  async detachQuestion(callerUserId: string, quizId: string, questionId: string) {
    await this.findOwnedOrCurated(callerUserId, quizId);

    const attachment = await this.prisma.quizQuestion.findUnique({
      where: { quizId_questionId: { quizId, questionId } },
    });
    if (!attachment) throw new NotFoundException('Question is not attached to this quiz');

    await this.prisma.$transaction(async (tx) => {
      await tx.quizQuestion.delete({
        where: { quizId_questionId: { quizId, questionId } },
      });
      await tx.quiz.update({ where: { id: quizId }, data: { version: { increment: 1 } } });
    });

    return this.fetchById(quizId);
  }

  async reorderQuestions(callerUserId: string, quizId: string, dto: ReorderQuestionsDto) {
    await this.findOwnedOrCurated(callerUserId, quizId);

    const ids = dto.orderings.map((o) => o.questionId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate questionIds in orderings');
    }
    const orders = dto.orderings.map((o) => o.order);
    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException('Duplicate order values in orderings');
    }

    const attached = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      select: { questionId: true },
    });
    const attachedIds = new Set(attached.map((a) => a.questionId));
    const providedIds = new Set(ids);
    if (
      attachedIds.size !== providedIds.size ||
      [...attachedIds].some((id) => !providedIds.has(id))
    ) {
      throw new BadRequestException(
        'Reorder must include EVERY currently-attached question exactly once',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Two-phase update to dodge the (quizId, order) unique constraint:
      // phase 1 sets all orders to negative offsets so nothing collides,
      // phase 2 sets them to the requested final values.
      for (let i = 0; i < ids.length; i++) {
        await tx.quizQuestion.update({
          where: { quizId_questionId: { quizId, questionId: ids[i] } },
          data: { order: -(i + 1) },
        });
      }
      for (const { questionId, order } of dto.orderings) {
        await tx.quizQuestion.update({
          where: { quizId_questionId: { quizId, questionId } },
          data: { order },
        });
      }
      await tx.quiz.update({ where: { id: quizId }, data: { version: { increment: 1 } } });
    });

    return this.fetchById(quizId);
  }

  // ---- internals ----

  private async fetchById(id: string) {
    const q = await this.prisma.quiz.findUnique({
      where: { id },
      include: QUIZ_DETAIL_INCLUDE,
    });
    if (!q) throw new NotFoundException('Quiz not found');
    return q;
  }

  private async findOwnedOrCurated(callerUserId: string, id: string) {
    const caller = await this.getCallerContext(callerUserId);
    const quiz = await this.prisma.quiz.findFirst({
      where: { id, deletedAt: null },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    if (caller.type === UserTypes.TEACHER) {
      if (
        quiz.ownerType !== QuizOwnerType.TEACHER_AUTHORED ||
        quiz.authorUserId !== callerUserId ||
        quiz.schoolId !== caller.schoolId
      ) {
        throw new ForbiddenException('You can only modify your own quizzes');
      }
    } else if (caller.type === UserTypes.SYSTEM_ADMIN) {
      if (quiz.ownerType !== QuizOwnerType.SCHOS_CURATED) {
        throw new ForbiddenException('System admins can only modify curated quizzes');
      }
    } else {
      throw new ForbiddenException('Not authorized to modify quizzes');
    }

    return quiz;
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
      return { ownerType: QuizOwnerType.TEACHER_AUTHORED, schoolId: caller.schoolId };
    }
    if (caller.type === UserTypes.SYSTEM_ADMIN) {
      return { ownerType: QuizOwnerType.SCHOS_CURATED, schoolId: null as string | null };
    }
    throw new ForbiddenException('Only teachers and system admins can author quizzes');
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

  private async replaceTopicTags(
    tx: Prisma.TransactionClient,
    quizId: string,
    topicIds: string[] | undefined,
  ) {
    if (!topicIds?.length) return;
    await tx.quizTopic.createMany({
      data: topicIds.map((topicId) => ({ quizId, topicId })),
      skipDuplicates: true,
    });
  }
}
