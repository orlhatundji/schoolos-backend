import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserType, CommentTemplateType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentTermService } from '../../shared/services/current-term.service';
import { ClassroomBroadsheetBuilder } from '../../utils/classroom-broadsheet.util';

@Injectable()
export class ResultCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currentTermService: CurrentTermService,
    private readonly broadsheetBuilder: ClassroomBroadsheetBuilder,
  ) {}

  // ─── Comments ──────────────────────────────────────────

  async upsertComment(
    data: {
      studentId: string;
      classArmId: string;
      termId?: string;
      teacherComment?: string;
      principalComment?: string;
    },
    userId: string,
    userType: UserType,
    schoolId: string,
  ) {
    const termId = await this.resolveTermId(data.termId, schoolId);
    await this.checkTermNotLocked(termId);

    const updateData: Record<string, any> = { updatedAt: new Date() };
    const createData: Record<string, any> = {};

    if (userType === UserType.TEACHER) {
      updateData.teacherComment = data.teacherComment ?? null;
      updateData.teacherCommentById = userId;
      createData.teacherComment = data.teacherComment ?? null;
      createData.teacherCommentById = userId;
    } else {
      // ADMIN or SUPER_ADMIN → principal comment
      updateData.principalComment = data.principalComment ?? null;
      updateData.principalCommentById = userId;
      createData.principalComment = data.principalComment ?? null;
      createData.principalCommentById = userId;
    }

    return this.prisma.resultComment.upsert({
      where: {
        studentId_classArmId_termId: {
          studentId: data.studentId,
          classArmId: data.classArmId,
          termId,
        },
      },
      update: updateData,
      create: {
        studentId: data.studentId,
        classArmId: data.classArmId,
        termId,
        ...createData,
      },
    });
  }

  async getComment(studentId: string, classArmId: string, termId: string) {
    return this.prisma.resultComment.findUnique({
      where: {
        studentId_classArmId_termId: { studentId, classArmId, termId },
      },
      include: {
        teacherCommentBy: { select: { firstName: true, lastName: true } },
        principalCommentBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getCommentsByClassArm(classArmId: string, termId: string, schoolId: string) {
    const resolvedTermId = await this.resolveTermId(termId, schoolId);
    return this.prisma.resultComment.findMany({
      where: { classArmId, termId: resolvedTermId },
      include: {
        teacherCommentBy: { select: { firstName: true, lastName: true } },
        principalCommentBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  // ─── Auto-Generate Principal Comments ──────────────────

  private readonly performanceTiers: { min: number; max: number; comment: string }[] = [
    { min: 90, max: 100, comment: 'An outstanding performance. Keep up the excellent work!' },
    { min: 75, max: 89, comment: 'A very good performance. Continue to strive for excellence.' },
    { min: 60, max: 74, comment: 'A good performance. There is room for further improvement.' },
    {
      min: 50,
      max: 59,
      comment: 'A fair performance. More effort is needed to achieve better results.',
    },
    {
      min: 40,
      max: 49,
      comment: 'Below average performance. Significant improvement is required.',
    },
    { min: 0, max: 39, comment: 'A poor performance. Urgent attention and hard work are needed.' },
  ];

  async autoGeneratePrincipalComments(
    classArmId: string,
    termId: string | undefined,
    schoolId: string,
    userId: string,
    force = false,
  ) {
    const resolvedTermId = await this.resolveTermId(termId, schoolId);
    await this.checkTermNotLocked(resolvedTermId);

    // Build broadsheet to get per-student overallAverage
    const broadsheetData = await this.broadsheetBuilder.buildBroadsheetData(schoolId, classArmId);

    // For term-specific averages, recalculate per the selected term
    const studentAverages = this.calculateTermAverages(broadsheetData, resolvedTermId);

    // Get existing comments if not force
    let existingCommentStudentIds = new Set<string>();
    if (!force) {
      const existing = await this.prisma.resultComment.findMany({
        where: {
          classArmId,
          termId: resolvedTermId,
          principalComment: { not: null },
        },
        select: { studentId: true },
      });
      existingCommentStudentIds = new Set(existing.map((c) => c.studentId));
    }

    // Generate comments for each student
    const operations = studentAverages
      .filter((s) => force || !existingCommentStudentIds.has(s.studentId))
      .map((student) => {
        const comment = this.getCommentForAverage(student.overallAverage);
        return this.prisma.resultComment.upsert({
          where: {
            studentId_classArmId_termId: {
              studentId: student.studentId,
              classArmId,
              termId: resolvedTermId,
            },
          },
          update: {
            principalComment: comment,
            principalCommentById: userId,
          },
          create: {
            studentId: student.studentId,
            classArmId,
            termId: resolvedTermId,
            principalComment: comment,
            principalCommentById: userId,
          },
        });
      });

    const results = await this.prisma.$transaction(operations);
    return { count: results.length };
  }

  private calculateTermAverages(
    broadsheetData: any,
    termId: string,
  ): { studentId: string; overallAverage: number }[] {
    return broadsheetData.students.map((student: any) => {
      const subjectPercentages: number[] = [];
      for (const subj of student.subjects) {
        const termScore = subj.termScores.find((ts: any) => ts.termId === termId);
        if (termScore && termScore.total > 0) {
          subjectPercentages.push(termScore.percentage);
        }
      }
      const overallAverage =
        subjectPercentages.length > 0
          ? Math.round(
              (subjectPercentages.reduce((sum: number, p: number) => sum + p, 0) /
                subjectPercentages.length) *
                100,
            ) / 100
          : 0;
      return { studentId: student.id, overallAverage };
    });
  }

  private getCommentForAverage(average: number): string {
    for (const tier of this.performanceTiers) {
      if (average >= tier.min) {
        return tier.comment;
      }
    }
    return this.performanceTiers[this.performanceTiers.length - 1].comment;
  }

  // ─── Comment Templates ────────────────────────────────

  async getCommentTemplates(schoolId: string, type?: CommentTemplateType) {
    return this.prisma.commentTemplate.findMany({
      where: {
        schoolId,
        deletedAt: null,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async createCommentTemplate(
    schoolId: string,
    content: string,
    type: CommentTemplateType,
    userId: string,
  ) {
    return this.prisma.commentTemplate.create({
      data: {
        schoolId,
        content,
        type,
        createdById: userId,
      },
    });
  }

  async updateCommentTemplate(templateId: string, content: string, schoolId: string) {
    const template = await this.prisma.commentTemplate.findFirst({
      where: { id: templateId, schoolId, deletedAt: null },
    });
    if (!template) throw new NotFoundException('Comment template not found');

    return this.prisma.commentTemplate.update({
      where: { id: templateId },
      data: { content },
    });
  }

  async deleteCommentTemplate(templateId: string, schoolId: string) {
    const template = await this.prisma.commentTemplate.findFirst({
      where: { id: templateId, schoolId, deletedAt: null },
    });
    if (!template) throw new NotFoundException('Comment template not found');

    return this.prisma.commentTemplate.update({
      where: { id: templateId },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Helpers ──────────────────────────────────────────

  private async resolveTermId(termId: string | undefined, schoolId: string): Promise<string> {
    if (termId) return termId;
    const currentTermId = await this.currentTermService.getCurrentTermId(schoolId);
    if (!currentTermId) throw new NotFoundException('No active term found for this school');
    return currentTermId;
  }

  private async checkTermNotLocked(termId: string): Promise<void> {
    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      select: { isLocked: true },
    });
    if (term?.isLocked) {
      throw new ForbiddenException('Term is locked. Comments cannot be modified.');
    }
  }
}
