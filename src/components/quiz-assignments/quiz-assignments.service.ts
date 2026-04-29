import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  QuizAssignmentStatus,
  QuizDeliveryMode,
  QuizOwnerType,
  QuizOverrideType,
  QuizStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { UserTypes } from '../users/constants';
import {
  CreateQuizAssignmentDto,
  GrantOverrideDto,
  QuizAssignmentQueryDto,
  UpdateQuizAssignmentDto,
} from './dto';
import {
  AssignmentWithRelations,
  computeEffectiveStatus,
} from './results/quiz-assignment.result';

const ASSIGNMENT_INCLUDE = {
  quiz: { select: { id: true, title: true, version: true, status: true, estimatedMinutes: true } },
  classArmSubject: {
    include: {
      classArm: { include: { level: true } },
      subject: true,
    },
  },
  term: { select: { id: true, name: true } },
  assignedByTeacher: {
    include: { user: { select: { firstName: true, lastName: true } } },
  },
  _count: { select: { attempts: true, overrides: true } },
} as const satisfies Prisma.QuizAssignmentInclude;

interface CallerContext {
  userId: string;
  type: string;
  schoolId: string | null;
  teacherId?: string;
  studentId?: string;
}

@Injectable()
export class QuizAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(callerUserId: string, dto: CreateQuizAssignmentDto) {
    const caller = await this.requireTeacher(callerUserId);

    await this.assertTeacherTeachesClassArmSubject(caller.teacherId!, dto.classArmSubjectId);

    const windowOpensAt = new Date(dto.windowOpensAt);
    const windowClosesAt = new Date(dto.windowClosesAt);
    this.validateWindow(windowOpensAt, windowClosesAt, dto.durationMinutes, dto.mode);

    const term = await this.prisma.term.findFirst({
      where: { id: dto.termId, deletedAt: null },
      select: { id: true },
    });
    if (!term) throw new BadRequestException('Term not found');

    const quiz = await this.prisma.quiz.findFirst({
      where: { id: dto.quizId, deletedAt: null },
      select: { id: true, version: true, status: true, ownerType: true, schoolId: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.status !== QuizStatus.PUBLISHED) {
      throw new BadRequestException('Quiz must be PUBLISHED before it can be assigned');
    }
    const isCurated = quiz.ownerType === QuizOwnerType.SCHOS_CURATED;
    const isOwnSchool = quiz.schoolId === caller.schoolId;
    if (!isCurated && !isOwnSchool) {
      throw new ForbiddenException('Quiz is not visible to your school');
    }

    const created = await this.prisma.quizAssignment.create({
      data: {
        quizId: quiz.id,
        quizVersion: quiz.version,
        classArmSubjectId: dto.classArmSubjectId,
        termId: dto.termId,
        assignedByTeacherId: caller.teacherId!,
        mode: dto.mode,
        windowOpensAt,
        windowClosesAt,
        durationMinutes: dto.durationMinutes,
        syncGracePeriodSeconds: dto.syncGracePeriodSeconds ?? 60,
        maxAttempts: dto.maxAttempts ?? 1,
        showResultsImmediately: dto.showResultsImmediately,
        showCorrectAnswers: dto.showCorrectAnswers,
        status: QuizAssignmentStatus.SCHEDULED,
      },
    });

    return this.fetchById(created.id);
  }

  async update(callerUserId: string, id: string, dto: UpdateQuizAssignmentDto) {
    const caller = await this.requireTeacher(callerUserId);
    const existing = await this.prisma.quizAssignment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Quiz assignment not found');
    await this.assertTeacherCanManage(caller.teacherId!, existing);

    if (existing.status === QuizAssignmentStatus.ARCHIVED) {
      throw new ConflictException('Cannot edit an archived assignment');
    }
    const now = new Date();
    if (now >= existing.windowOpensAt) {
      throw new ConflictException(
        'Edits are only allowed before the assignment window opens',
      );
    }

    const nextOpens = dto.windowOpensAt ? new Date(dto.windowOpensAt) : existing.windowOpensAt;
    const nextCloses = dto.windowClosesAt
      ? new Date(dto.windowClosesAt)
      : existing.windowClosesAt;
    const nextDuration = dto.durationMinutes ?? existing.durationMinutes;
    this.validateWindow(nextOpens, nextCloses, nextDuration, existing.mode);

    await this.prisma.quizAssignment.update({
      where: { id },
      data: {
        ...(dto.windowOpensAt !== undefined && { windowOpensAt: nextOpens }),
        ...(dto.windowClosesAt !== undefined && { windowClosesAt: nextCloses }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.syncGracePeriodSeconds !== undefined && {
          syncGracePeriodSeconds: dto.syncGracePeriodSeconds,
        }),
        ...(dto.maxAttempts !== undefined && { maxAttempts: dto.maxAttempts }),
        ...(dto.showResultsImmediately !== undefined && {
          showResultsImmediately: dto.showResultsImmediately,
        }),
        ...(dto.showCorrectAnswers !== undefined && {
          showCorrectAnswers: dto.showCorrectAnswers,
        }),
      },
    });

    return this.fetchById(id);
  }

  async softDelete(callerUserId: string, id: string) {
    const caller = await this.requireTeacher(callerUserId);
    const existing = await this.prisma.quizAssignment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Quiz assignment not found');
    await this.assertTeacherCanManage(caller.teacherId!, existing);

    const attemptCount = await this.prisma.quizAttempt.count({ where: { quizAssignmentId: id } });
    if (attemptCount > 0) {
      throw new ConflictException(
        `Cannot cancel: ${attemptCount} attempt(s) already started. Archive after the window closes instead.`,
      );
    }

    await this.prisma.quizAssignment.update({
      where: { id },
      data: { deletedAt: new Date(), status: QuizAssignmentStatus.ARCHIVED },
    });
  }

  async grantOverride(callerUserId: string, assignmentId: string, dto: GrantOverrideDto) {
    const caller = await this.requireTeacher(callerUserId);
    const assignment = await this.prisma.quizAssignment.findFirst({
      where: { id: assignmentId, deletedAt: null },
      include: {
        classArmSubject: { select: { classArmId: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Quiz assignment not found');
    await this.assertTeacherCanManage(caller.teacherId!, assignment);

    const studentEnrollment = await this.prisma.classArmStudent.findFirst({
      where: {
        studentId: dto.studentId,
        classArmId: assignment.classArmSubject.classArmId,
        isActive: true,
        deletedAt: null,
      },
    });
    if (!studentEnrollment) {
      throw new BadRequestException(
        'Student is not actively enrolled in this class arm',
      );
    }

    this.validateOverridePayload(dto, assignment.windowClosesAt);

    const created = await this.prisma.quizAttemptOverride.create({
      data: {
        quizAssignmentId: assignmentId,
        studentId: dto.studentId,
        grantedByTeacherId: caller.teacherId!,
        type: dto.type,
        extraAttempts: dto.type === QuizOverrideType.RETRY ? dto.extraAttempts ?? 1 : null,
        extraMinutes: dto.type === QuizOverrideType.EXTRA_TIME ? dto.extraMinutes ?? null : null,
        newWindowClosesAt:
          dto.type === QuizOverrideType.EXTEND_WINDOW
            ? new Date(dto.newWindowClosesAt!)
            : null,
        reason: dto.reason,
      },
    });

    return created;
  }

  async releaseResults(callerUserId: string, id: string) {
    const caller = await this.requireTeacher(callerUserId);
    const existing = await this.prisma.quizAssignment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Quiz assignment not found');
    await this.assertTeacherCanManage(caller.teacherId!, existing);

    if (existing.resultsReleasedAt) {
      return existing.resultsReleasedAt;
    }
    if (existing.showResultsImmediately === true) {
      throw new ConflictException(
        'Results are already shown immediately for this assignment — nothing to release',
      );
    }

    const now = new Date();
    await this.prisma.quizAssignment.update({
      where: { id },
      data: { resultsReleasedAt: now },
    });
    return now;
  }

  async getMonitor(callerUserId: string, id: string) {
    const caller = await this.requireTeacher(callerUserId);
    const assignment = await this.prisma.quizAssignment.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...ASSIGNMENT_INCLUDE,
        classArmSubject: {
          include: {
            classArm: { include: { level: true } },
            subject: true,
          },
        },
      },
    });
    if (!assignment) throw new NotFoundException('Quiz assignment not found');
    await this.assertTeacherCanManage(caller.teacherId!, assignment);

    const enrollments = await this.prisma.classArmStudent.findMany({
      where: {
        classArmId: assignment.classArmSubject.classArmId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ student: { studentNo: 'asc' } }],
    });

    const attempts = await this.prisma.quizAttempt.findMany({
      where: { quizAssignmentId: id },
      select: {
        id: true,
        studentId: true,
        attemptNumber: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        percentage: true,
      },
    });
    const attemptsByStudent = new Map<string, typeof attempts>();
    for (const a of attempts) {
      const list = attemptsByStudent.get(a.studentId) ?? [];
      list.push(a);
      attemptsByStudent.set(a.studentId, list);
    }

    return {
      assignment: assignment as AssignmentWithRelations,
      students: enrollments.map((e) => ({
        student: e.student,
        attempts: attemptsByStudent.get(e.studentId) ?? [],
      })),
    };
  }

  async getResults(callerUserId: string, id: string) {
    const caller = await this.requireTeacher(callerUserId);
    const assignment = await this.prisma.quizAssignment.findFirst({
      where: { id, deletedAt: null },
      include: ASSIGNMENT_INCLUDE,
    });
    if (!assignment) throw new NotFoundException('Quiz assignment not found');
    await this.assertTeacherCanManage(caller.teacherId!, assignment);

    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        quizAssignmentId: id,
        status: { in: ['SUBMITTED', 'GRADING', 'GRADED'] },
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ student: { studentNo: 'asc' } }, { attemptNumber: 'desc' }],
    });

    return { assignment: assignment as AssignmentWithRelations, attempts };
  }

  async listForTeacher(callerUserId: string, query: QuizAssignmentQueryDto) {
    const caller = await this.requireTeacher(callerUserId);
    const teachingClassArmSubjects = await this.prisma.classArmSubjectTeacher.findMany({
      where: { teacherId: caller.teacherId!, deletedAt: null },
      select: { classArmSubjectId: true },
    });
    const taughtIds = teachingClassArmSubjects.map((t) => t.classArmSubjectId);

    const where: Prisma.QuizAssignmentWhereInput = {
      deletedAt: null,
      OR: [
        { assignedByTeacherId: caller.teacherId! },
        ...(taughtIds.length > 0
          ? [{ classArmSubjectId: { in: taughtIds } } as Prisma.QuizAssignmentWhereInput]
          : []),
      ],
    };
    if (query.classArmSubjectId) where.classArmSubjectId = query.classArmSubjectId;
    if (query.termId) where.termId = query.termId;
    if (query.status) where.status = query.status;
    if (query.mode) where.mode = query.mode;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.quizAssignment.findMany({
        where,
        include: ASSIGNMENT_INCLUDE,
        orderBy: [{ windowOpensAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quizAssignment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async listForStudent(callerUserId: string, query: QuizAssignmentQueryDto) {
    const caller = await this.requireStudent(callerUserId);
    const enrollments = await this.prisma.classArmStudent.findMany({
      where: { studentId: caller.studentId!, isActive: true, deletedAt: null },
      select: { classArmId: true },
    });
    const classArmIds = enrollments.map((e) => e.classArmId);
    if (classArmIds.length === 0) {
      return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
    }

    const where: Prisma.QuizAssignmentWhereInput = {
      deletedAt: null,
      classArmSubject: { classArmId: { in: classArmIds } },
    };
    if (query.termId) where.termId = query.termId;
    if (query.status) where.status = query.status;
    if (query.mode) where.mode = query.mode;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.quizAssignment.findMany({
        where,
        include: ASSIGNMENT_INCLUDE,
        orderBy: [{ windowOpensAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quizAssignment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findByIdForTeacher(callerUserId: string, id: string) {
    const caller = await this.requireTeacher(callerUserId);
    const assignment = await this.fetchById(id);
    await this.assertTeacherCanManage(caller.teacherId!, assignment);
    return assignment;
  }

  async findByIdForStudent(callerUserId: string, id: string) {
    const caller = await this.requireStudent(callerUserId);
    const assignment = await this.fetchById(id);
    const enrolled = await this.prisma.classArmStudent.findFirst({
      where: {
        studentId: caller.studentId!,
        classArmId: assignment.classArmSubject.classArmId,
        isActive: true,
        deletedAt: null,
      },
    });
    if (!enrolled) {
      throw new NotFoundException('Quiz assignment not found');
    }
    return assignment;
  }

  // ---- internals ----

  private async fetchById(id: string): Promise<AssignmentWithRelations> {
    const assignment = await this.prisma.quizAssignment.findFirst({
      where: { id, deletedAt: null },
      include: ASSIGNMENT_INCLUDE,
    });
    if (!assignment) throw new NotFoundException('Quiz assignment not found');
    return assignment as AssignmentWithRelations;
  }

  private async requireTeacher(callerUserId: string): Promise<CallerContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: callerUserId },
      select: { id: true, type: true, schoolId: true, teacher: { select: { id: true } } },
    });
    if (!user) throw new ForbiddenException('Caller not found');
    if (user.type !== UserTypes.TEACHER || !user.teacher) {
      throw new ForbiddenException('Only teachers can manage quiz assignments');
    }
    return {
      userId: user.id,
      type: user.type,
      schoolId: user.schoolId,
      teacherId: user.teacher.id,
    };
  }

  private async requireStudent(callerUserId: string): Promise<CallerContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: callerUserId },
      select: { id: true, type: true, schoolId: true, student: { select: { id: true } } },
    });
    if (!user) throw new ForbiddenException('Caller not found');
    if (user.type !== UserTypes.STUDENT || !user.student) {
      throw new ForbiddenException('Only students can use this endpoint');
    }
    return {
      userId: user.id,
      type: user.type,
      schoolId: user.schoolId,
      studentId: user.student.id,
    };
  }

  private async assertTeacherTeachesClassArmSubject(
    teacherId: string,
    classArmSubjectId: string,
  ) {
    const link = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { teacherId, classArmSubjectId, deletedAt: null },
    });
    if (!link) {
      throw new ForbiddenException('You do not teach this class arm subject');
    }
  }

  private async assertTeacherCanManage(
    teacherId: string,
    assignment: { assignedByTeacherId: string; classArmSubjectId: string },
  ) {
    if (assignment.assignedByTeacherId === teacherId) return;
    const link = await this.prisma.classArmSubjectTeacher.findFirst({
      where: {
        teacherId,
        classArmSubjectId: assignment.classArmSubjectId,
        deletedAt: null,
      },
    });
    if (!link) {
      throw new ForbiddenException('You are not authorized to manage this assignment');
    }
  }

  private validateWindow(
    opensAt: Date,
    closesAt: Date,
    durationMinutes: number,
    mode: QuizDeliveryMode,
  ) {
    if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
      throw new BadRequestException('Invalid window timestamps');
    }
    if (closesAt <= opensAt) {
      throw new BadRequestException('windowClosesAt must be after windowOpensAt');
    }
    const windowMinutes = (closesAt.getTime() - opensAt.getTime()) / 60_000;
    if (mode === QuizDeliveryMode.SYNC_START && durationMinutes > windowMinutes) {
      throw new BadRequestException(
        `SYNC_START requires durationMinutes (${durationMinutes}) to fit inside the window (${windowMinutes.toFixed(0)} min)`,
      );
    }
    if (mode === QuizDeliveryMode.OPEN_WINDOW && durationMinutes > windowMinutes) {
      throw new BadRequestException(
        `OPEN_WINDOW requires durationMinutes (${durationMinutes}) to fit inside the window (${windowMinutes.toFixed(0)} min) — last students could be cut off`,
      );
    }
  }

  private validateOverridePayload(dto: GrantOverrideDto, currentWindowClosesAt: Date) {
    switch (dto.type) {
      case QuizOverrideType.RETRY:
        if (!dto.extraAttempts || dto.extraAttempts < 1) {
          throw new BadRequestException('RETRY override requires extraAttempts >= 1');
        }
        return;
      case QuizOverrideType.EXTRA_TIME:
        if (!dto.extraMinutes || dto.extraMinutes < 1) {
          throw new BadRequestException('EXTRA_TIME override requires extraMinutes >= 1');
        }
        return;
      case QuizOverrideType.EXTEND_WINDOW: {
        if (!dto.newWindowClosesAt) {
          throw new BadRequestException(
            'EXTEND_WINDOW override requires newWindowClosesAt',
          );
        }
        const next = new Date(dto.newWindowClosesAt);
        if (Number.isNaN(next.getTime()) || next <= currentWindowClosesAt) {
          throw new BadRequestException(
            'newWindowClosesAt must be after the assignment\'s current windowClosesAt',
          );
        }
        return;
      }
    }
  }

  computeEffectiveStatus = computeEffectiveStatus;
}
