import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AggregationMethod,
  AssessmentStructureTemplate,
  MissingAttemptPolicy,
  Prisma,
  QuizAggregationStatus,
  QuizAttemptStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { UserTypes } from '../users/constants';
import { computeForStudent, ItemAttemptInput } from './compute';
import {
  AggregationItemDto,
  AggregationQueryDto,
  CreateAggregationDto,
  UpdateAggregationDto,
} from './dto';

interface AssessmentSlotEntry {
  id: string;
  name: string;
  maxScore: number;
  isExam: boolean;
  order: number;
}

const AGGREGATION_INCLUDE = {
  items: {
    include: {
      quizAssignment: {
        select: {
          id: true,
          windowOpensAt: true,
          quiz: { select: { id: true, title: true } },
        },
      },
    },
  },
} as const satisfies Prisma.QuizScoreAggregationInclude;

@Injectable()
export class QuizAggregationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- public API ----------

  async create(callerUserId: string, dto: CreateAggregationDto) {
    const teacher = await this.requireTeacher(callerUserId);
    const { schoolId, classArmId } = await this.assertTeacherTeachesClassArmSubject(
      teacher.id,
      dto.classArmSubjectId,
    );

    await this.validateAssessmentSlot(schoolId, dto.termId, dto.assessmentTemplateEntryId);
    await this.validateItems(dto.items, dto.classArmSubjectId, dto.termId);
    if (dto.aggregationMethod === AggregationMethod.BEST_OF_N && !dto.bestOfN) {
      throw new BadRequestException('BEST_OF_N requires bestOfN');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const agg = await tx.quizScoreAggregation.create({
        data: {
          schoolId,
          classArmSubjectId: dto.classArmSubjectId,
          termId: dto.termId,
          assessmentTemplateEntryId: dto.assessmentTemplateEntryId,
          name: dto.name,
          aggregationMethod: dto.aggregationMethod,
          bestOfN: dto.bestOfN ?? null,
          rescaleToMaxScore: dto.rescaleToMaxScore,
          missingAttemptPolicy: dto.missingAttemptPolicy ?? MissingAttemptPolicy.TREAT_AS_ZERO,
          status: QuizAggregationStatus.DRAFT,
        },
      });
      await tx.quizScoreAggregationItem.createMany({
        data: dto.items.map((i) => ({
          aggregationId: agg.id,
          quizAssignmentId: i.quizAssignmentId,
          weight: new Prisma.Decimal((i.weight ?? 1).toFixed(2)),
        })),
      });
      return agg;
    });

    void classArmId;
    return this.fetchById(created.id);
  }

  async update(callerUserId: string, id: string, dto: UpdateAggregationDto) {
    const teacher = await this.requireTeacher(callerUserId);
    const existing = await this.findOrThrow(id);
    await this.assertTeacherTeachesClassArmSubject(teacher.id, existing.classArmSubjectId);

    if (existing.status !== QuizAggregationStatus.DRAFT) {
      throw new ConflictException('Only DRAFT aggregations can be edited');
    }

    if (dto.items) {
      await this.validateItems(dto.items, existing.classArmSubjectId, existing.termId);
    }

    const nextMethod = dto.aggregationMethod ?? existing.aggregationMethod;
    const nextBestOfN = dto.bestOfN ?? existing.bestOfN;
    if (nextMethod === AggregationMethod.BEST_OF_N && !nextBestOfN) {
      throw new BadRequestException('BEST_OF_N requires bestOfN');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.quizScoreAggregation.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.aggregationMethod !== undefined && { aggregationMethod: dto.aggregationMethod }),
          ...(dto.bestOfN !== undefined && { bestOfN: dto.bestOfN }),
          ...(dto.rescaleToMaxScore !== undefined && { rescaleToMaxScore: dto.rescaleToMaxScore }),
          ...(dto.missingAttemptPolicy !== undefined && {
            missingAttemptPolicy: dto.missingAttemptPolicy,
          }),
        },
      });
      if (dto.items) {
        await tx.quizScoreAggregationItem.deleteMany({ where: { aggregationId: id } });
        await tx.quizScoreAggregationItem.createMany({
          data: dto.items.map((i) => ({
            aggregationId: id,
            quizAssignmentId: i.quizAssignmentId,
            weight: new Prisma.Decimal((i.weight ?? 1).toFixed(2)),
          })),
        });
      }
    });

    return this.fetchById(id);
  }

  async softDelete(callerUserId: string, id: string) {
    const teacher = await this.requireTeacher(callerUserId);
    const existing = await this.findOrThrow(id);
    await this.assertTeacherTeachesClassArmSubject(teacher.id, existing.classArmSubjectId);

    if (existing.status !== QuizAggregationStatus.DRAFT) {
      throw new ConflictException(
        'Cannot delete a FINALIZED aggregation — the gradebook entries it created remain in place',
      );
    }
    await this.prisma.quizScoreAggregation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findById(callerUserId: string, id: string) {
    const teacher = await this.requireTeacher(callerUserId);
    const agg = await this.findOrThrow(id);
    await this.assertTeacherTeachesClassArmSubject(teacher.id, agg.classArmSubjectId);
    return this.fetchById(id);
  }

  async list(callerUserId: string, query: AggregationQueryDto) {
    const teacher = await this.requireTeacher(callerUserId);

    const taughtSubjects = await this.prisma.classArmSubjectTeacher.findMany({
      where: { teacherId: teacher.id, deletedAt: null },
      select: { classArmSubjectId: true },
    });
    const taughtIds = taughtSubjects.map((t) => t.classArmSubjectId);
    if (taughtIds.length === 0) {
      return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
    }

    const where: Prisma.QuizScoreAggregationWhereInput = {
      deletedAt: null,
      classArmSubjectId: { in: taughtIds },
    };
    if (query.classArmSubjectId) where.classArmSubjectId = query.classArmSubjectId;
    if (query.termId) where.termId = query.termId;
    if (query.status) where.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.quizScoreAggregation.findMany({
        where,
        include: AGGREGATION_INCLUDE,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quizScoreAggregation.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async preview(callerUserId: string, id: string) {
    const teacher = await this.requireTeacher(callerUserId);
    const agg = await this.fetchById(id);
    await this.assertTeacherTeachesClassArmSubject(teacher.id, agg.classArmSubjectId);
    return this.computeRows(agg);
  }

  /**
   * Synchronous transactional finalize. Recomputes from latest data, upserts
   * one ClassArmStudentAssessment per active student keyed by the slot's name,
   * and flips the aggregation to FINALIZED. Idempotent — re-finalize re-runs
   * compute and re-upserts.
   */
  async finalize(callerUserId: string, id: string) {
    const teacher = await this.requireTeacher(callerUserId);
    const agg = await this.fetchById(id);
    await this.assertTeacherTeachesClassArmSubject(teacher.id, agg.classArmSubjectId);

    const slot = await this.lookupSlot(agg.schoolId, agg.termId, agg.assessmentTemplateEntryId);

    const computed = await this.computeRows(agg);

    const finalizedAt = new Date();
    let upsertedRows = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of computed.rows) {
        await tx.classArmStudentAssessment.upsert({
          where: {
            classArmSubjectId_studentId_termId_name: {
              classArmSubjectId: agg.classArmSubjectId,
              studentId: row.studentId,
              termId: agg.termId,
              name: slot.name,
            },
          },
          create: {
            classArmSubjectId: agg.classArmSubjectId,
            studentId: row.studentId,
            termId: agg.termId,
            name: slot.name,
            score: row.rescaledScore,
            maxScore: agg.rescaleToMaxScore,
            isExam: slot.isExam,
            assessmentTypeId: slot.id,
          },
          update: {
            score: row.rescaledScore,
            maxScore: agg.rescaleToMaxScore,
            isExam: slot.isExam,
            assessmentTypeId: slot.id,
          },
        });
        upsertedRows += 1;
      }

      await tx.quizScoreAggregation.update({
        where: { id },
        data: {
          status: QuizAggregationStatus.FINALIZED,
          finalizedAt,
          finalizedByTeacherId: teacher.id,
        },
      });
    });

    return { upsertedRows, finalizedAt };
  }

  // ---------- internals ----------

  private async fetchById(id: string) {
    const agg = await this.prisma.quizScoreAggregation.findFirst({
      where: { id, deletedAt: null },
      include: AGGREGATION_INCLUDE,
    });
    if (!agg) throw new NotFoundException('Aggregation not found');
    return agg;
  }

  private async findOrThrow(id: string) {
    const agg = await this.prisma.quizScoreAggregation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!agg) throw new NotFoundException('Aggregation not found');
    return agg;
  }

  private async requireTeacher(callerUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: callerUserId },
      select: {
        id: true,
        type: true,
        schoolId: true,
        teacher: { select: { id: true } },
      },
    });
    if (!user || user.type !== UserTypes.TEACHER || !user.teacher) {
      throw new ForbiddenException('Only teachers can manage quiz aggregations');
    }
    return { id: user.teacher.id, schoolId: user.schoolId };
  }

  private async assertTeacherTeachesClassArmSubject(
    teacherId: string,
    classArmSubjectId: string,
  ) {
    const link = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { teacherId, classArmSubjectId, deletedAt: null },
      include: {
        classArmSubject: {
          include: { classArm: { select: { id: true, schoolId: true } } },
        },
      },
    });
    if (!link) {
      throw new ForbiddenException('You do not teach this class arm subject');
    }
    return {
      schoolId: link.classArmSubject.classArm.schoolId,
      classArmId: link.classArmSubject.classArm.id,
    };
  }

  private async validateItems(
    items: AggregationItemDto[],
    classArmSubjectId: string,
    termId: string,
  ) {
    const ids = items.map((i) => i.quizAssignmentId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate quizAssignmentIds in items');
    }
    const found = await this.prisma.quizAssignment.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, classArmSubjectId: true, termId: true },
    });
    const byId = new Map(found.map((a) => [a.id, a]));
    for (const id of ids) {
      const a = byId.get(id);
      if (!a) {
        throw new BadRequestException(`Quiz assignment ${id} not found`);
      }
      if (a.classArmSubjectId !== classArmSubjectId || a.termId !== termId) {
        throw new BadRequestException(
          `Quiz assignment ${id} does not match this aggregation's classArmSubject + term`,
        );
      }
    }
  }

  private async validateAssessmentSlot(
    schoolId: string,
    termId: string,
    entryId: string,
  ) {
    await this.lookupSlot(schoolId, termId, entryId);
  }

  private async lookupSlot(
    schoolId: string,
    termId: string,
    entryId: string,
  ): Promise<AssessmentSlotEntry> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, deletedAt: null },
      select: { academicSessionId: true },
    });
    if (!term) throw new BadRequestException('Term not found');

    const template = (await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        schoolId,
        academicSessionId: term.academicSessionId,
        isActive: true,
        deletedAt: null,
      },
    })) as AssessmentStructureTemplate | null;
    if (!template) {
      throw new BadRequestException(
        'No active assessment structure template for this school + session — set one up first',
      );
    }
    const entries = (template.assessments as unknown) as AssessmentSlotEntry[];
    const entry = Array.isArray(entries)
      ? entries.find((e) => e?.id === entryId)
      : undefined;
    if (!entry) {
      throw new BadRequestException(
        `assessmentTemplateEntryId ${entryId} not found in the active template`,
      );
    }
    return entry;
  }

  /**
   * Loads the class arm's active students + their best attempts per item,
   * then runs the pure compute for each student.
   */
  private async computeRows(agg: Awaited<ReturnType<typeof this.fetchById>>) {
    const classArmSubject = await this.prisma.classArmSubject.findUnique({
      where: { id: agg.classArmSubjectId },
      select: { classArmId: true },
    });
    if (!classArmSubject) {
      throw new BadRequestException('classArmSubject not found');
    }

    const enrollments = await this.prisma.classArmStudent.findMany({
      where: {
        classArmId: classArmSubject.classArmId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: [{ student: { studentNo: 'asc' } }],
    });

    const itemAssignmentIds = agg.items.map((i) => i.quizAssignmentId);
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        quizAssignmentId: { in: itemAssignmentIds },
        status: QuizAttemptStatus.GRADED,
        studentId: { in: enrollments.map((e) => e.studentId) },
      },
      select: {
        studentId: true,
        quizAssignmentId: true,
        totalScore: true,
        maxScore: true,
        percentage: true,
      },
    });

    // Pick the BEST (highest percentage) GRADED attempt per (student, assignment).
    const bestKey = (s: string, q: string) => `${s}::${q}`;
    const best = new Map<string, (typeof attempts)[number]>();
    for (const a of attempts) {
      const key = bestKey(a.studentId, a.quizAssignmentId);
      const prev = best.get(key);
      if (
        !prev ||
        Number(a.percentage?.toString() ?? 0) > Number(prev.percentage?.toString() ?? 0)
      ) {
        best.set(key, a);
      }
    }

    const aggregation = agg;

    const rows = enrollments.map((e) => {
      const itemInputs: ItemAttemptInput[] = aggregation.items.map((item) => {
        const a = best.get(bestKey(e.studentId, item.quizAssignmentId));
        return {
          weight: Number(item.weight.toString()),
          attempt: a
            ? {
                percentage: Number(a.percentage?.toString() ?? 0),
                totalScore: Number(a.totalScore?.toString() ?? 0),
                maxScore: Number(a.maxScore.toString()),
              }
            : null,
        };
      });

      const result = computeForStudent(
        itemInputs,
        aggregation.aggregationMethod,
        aggregation.missingAttemptPolicy,
        aggregation.rescaleToMaxScore,
        aggregation.bestOfN,
      );

      return {
        studentId: e.studentId,
        studentNo: e.student.studentNo,
        firstName: e.student.user.firstName,
        lastName: e.student.user.lastName,
        items: aggregation.items.map((item, idx) => ({
          quizAssignmentId: item.quizAssignmentId,
          quizTitle: item.quizAssignment.quiz.title,
          percentage: result.items[idx].percentage,
          missing: result.items[idx].missing,
        })),
        computedPercentage: result.computedPercentage,
        rescaledScore: result.rescaledScore,
      };
    });

    return { aggregation, rows };
  }
}
