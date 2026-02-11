import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';

import { PrismaService } from '../../../../prisma';
import { AssessmentStructureTemplateService } from '../../../assessment-structures/assessment-structure-template.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { SubjectsViewData, SubjectDetailsData, SubjectClassAssessmentData } from '../types';

@Injectable()
export class BffAdminSubjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: AssessmentStructureTemplateService,
  ) {}

  async getSubjectsViewData(userId: string): Promise<SubjectsViewData> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get current academic session
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      // Return empty data for new schools without academic sessions
      return {
        stats: {
          totalSubjects: 0,
          categoryBreakdown: {
            core: 0,
            general: 0,
            vocational: 0,
          },
          departmentBreakdown: {},
        },
        subjects: [],
      };
    }

    // Get all subjects for the school with their related data (filtered by current session)
    const subjects = await this.prisma.subject.findMany({
      where: {
        schoolId,
        deletedAt: null, // Only active subjects
      },
      include: {
        department: true,
        category: true,
        classArmSubjects: {
          where: {
            deletedAt: null,
            classArm: {
              academicSessionId: currentSession.id,
              deletedAt: null,
            },
          },
          include: {
            classArm: {
              include: {
                classArmStudents: {
                  where: {
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate statistics
    const totalSubjects = subjects.length;

    // Calculate category breakdown using the new category relation
    const coreSubjects = subjects.filter((subject) => subject.category?.name === 'Core').length;
    const generalSubjects = subjects.filter((subject) => subject.category?.name === 'General').length;
    const vocationalSubjects = subjects.filter(
      (subject) => subject.category?.name === 'Vocational',
    ).length;

    const categoryBreakdown = {
      core: coreSubjects,
      general: generalSubjects,
      vocational: vocationalSubjects,
    };

    // Calculate department breakdown
    const departmentBreakdown: { [key: string]: number } = {};
    subjects.forEach((subject) => {
      const departmentName = subject.department?.name || 'Unassigned';
      departmentBreakdown[departmentName] = (departmentBreakdown[departmentName] || 0) + 1;
    });

    // Process subject data for the list
    const subjectsData = subjects.map((subject) => {
      // Count classes from classArmSubjects (each represents a unique class-subject pair)
      const classesCount = subject.classArmSubjects.length;

      // Calculate student count (total students in all classes taking this subject)
      const studentCount = subject.classArmSubjects.reduce(
        (total, cas) => total + cas.classArm.classArmStudents.length,
        0,
      );

      // Determine status (active if not deleted)
      const status: 'active' | 'inactive' = subject.deletedAt ? 'inactive' : 'active';

      return {
        id: subject.id,
        name: subject.name,
        department: subject.department?.name || null,
        category: subject.category?.name || null,
        classesCount,
        studentCount,
        status,
      };
    });

    return {
      stats: {
        totalSubjects,
        categoryBreakdown,
        departmentBreakdown,
      },
      subjects: subjectsData,
    };
  }

  async createSubject(userId: string, createSubjectDto: CreateSubjectDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if subject with same name already exists in the school
    const existingSubject = await this.prisma.subject.findFirst({
      where: {
        schoolId,
        name: {
          equals: createSubjectDto.name,
          mode: 'insensitive', // Case-insensitive comparison
        },
        deletedAt: null,
      },
    });

    if (existingSubject) {
      throw new ConflictException(`Subject with name '${createSubjectDto.name}' already exists`);
    }

    // Validate department if provided
    if (createSubjectDto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: createSubjectDto.departmentId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!department) {
        throw new BadRequestException('Department not found or does not belong to this school');
      }
    }

    // Validate category if provided
    if (createSubjectDto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: createSubjectDto.categoryId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!category) {
        throw new BadRequestException('Category not found or does not belong to this school');
      }
    }

    // Create the subject
    const subject = await this.prisma.subject.create({
      data: {
        name: createSubjectDto.name,
        schoolId,
        departmentId: createSubjectDto.departmentId || null,
        categoryId: createSubjectDto.categoryId || null,
      },
      include: {
        department: true,
        category: true,
      },
    });

    return {
      id: subject.id,
      name: subject.name,
      category: subject.category?.name || null,
      categoryId: subject.categoryId,
      department: subject.department?.name || null,
      departmentId: subject.departmentId,
      schoolId: subject.schoolId,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
  }

  async updateSubject(userId: string, subjectId: string, updateSubjectDto: UpdateSubjectDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if subject exists and belongs to the school
    const existingSubject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existingSubject) {
      throw new NotFoundException('Subject not found');
    }

    // If name is being changed, check for existing assessment scores
    if (updateSubjectDto.name && updateSubjectDto.name !== existingSubject.name) {
      const assessmentCount = await this.prisma.classArmStudentAssessment.count({
        where: {
          classArmSubject: { subjectId },
          deletedAt: null,
        },
      });

      if (assessmentCount > 0) {
        throw new BadRequestException(
          'Cannot rename subject. It has associated assessment scores. You can still update the department and category.',
        );
      }
    }

    // Check for name conflict if name is being updated
    if (updateSubjectDto.name && updateSubjectDto.name !== existingSubject.name) {
      const nameConflict = await this.prisma.subject.findFirst({
        where: {
          schoolId,
          name: {
            equals: updateSubjectDto.name,
            mode: 'insensitive',
          },
          id: { not: subjectId },
          deletedAt: null,
        },
      });

      if (nameConflict) {
        throw new ConflictException(`Subject with name '${updateSubjectDto.name}' already exists`);
      }
    }

    // Validate department if provided
    if (updateSubjectDto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: updateSubjectDto.departmentId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!department) {
        throw new BadRequestException('Department not found or does not belong to this school');
      }
    }

    // Update the subject
    const updatedSubject = await this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(updateSubjectDto.name && { name: updateSubjectDto.name }),
        ...(updateSubjectDto.categoryId !== undefined && { categoryId: updateSubjectDto.categoryId }),
        ...(updateSubjectDto.departmentId !== undefined && {
          departmentId: updateSubjectDto.departmentId,
        }),
      },
      include: {
        department: true,
        category: true,
      },
    });

    return {
      id: updatedSubject.id,
      name: updatedSubject.name,
      category: updatedSubject.category?.name || null,
      categoryId: updatedSubject.categoryId,
      department: updatedSubject.department?.name || null,
      departmentId: updatedSubject.departmentId,
      schoolId: updatedSubject.schoolId,
      createdAt: updatedSubject.createdAt,
      updatedAt: updatedSubject.updatedAt,
    };
  }

  async deleteSubject(userId: string, subjectId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if subject exists and belongs to the school
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
        deletedAt: null,
      },
      include: {
        classArmSubjects: {
          where: { deletedAt: null },
          include: {
            assessments: {
              where: { deletedAt: null },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Check if subject has any assessments
    const hasAssessments = subject.classArmSubjects.some(
      (cas) => cas.assessments.length > 0,
    );

    if (hasAssessments) {
      throw new BadRequestException(
        'Cannot delete subject. It has associated assessments. Please remove all assessments first.',
      );
    }

    // Soft delete the subject
    await this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Subject deleted successfully',
      id: subjectId,
    };
  }

  private async getUserSchoolId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });
    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }
    return user.schoolId;
  }

  async getSubjectDetails(userId: string, subjectId: string): Promise<SubjectDetailsData> {
    const schoolId = await this.getUserSchoolId(userId);

    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      throw new NotFoundException('No active academic session found');
    }

    // Get subject with classArmSubjects and their teachers
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId, deletedAt: null },
      include: {
        department: true,
        category: true,
        classArmSubjects: {
          where: {
            deletedAt: null,
            classArm: { academicSessionId: currentSession.id, deletedAt: null },
          },
          include: {
            teachers: {
              where: { deletedAt: null },
              include: {
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
              },
            },
            classArm: {
              include: {
                level: true,
                classArmStudents: { where: { isActive: true } },
              },
            },
            assessments: {
              where: { deletedAt: null },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Build classes from classArmSubjects
    const classes = subject.classArmSubjects.map((cas) => {
      const firstTeacher = cas.teachers[0];
      return {
        classArmId: cas.classArmId,
        classArmName: cas.classArm.name,
        levelName: cas.classArm.level?.name || '',
        teacherName: firstTeacher?.teacher?.user
          ? `${firstTeacher.teacher.user.firstName} ${firstTeacher.teacher.user.lastName}`
          : null,
        teacherId: firstTeacher?.teacherId || null,
        studentCount: cas.classArm.classArmStudents.length,
        hasAssessments: cas.assessments.length > 0,
      };
    });

    // Check if subject has any assessment scores at all (for edit guard)
    const hasAssessmentScores = await this.prisma.classArmStudentAssessment.count({
      where: {
        classArmSubject: { subjectId },
        deletedAt: null,
      },
    }) > 0;

    return {
      subject: {
        id: subject.id,
        name: subject.name,
        department: subject.department?.name || null,
        category: subject.category?.name || null,
        code: subject.name.substring(0, 3).toUpperCase(),
      },
      classes,
      hasAssessmentScores,
    };
  }

  async getClassAssessments(
    userId: string,
    subjectId: string,
    classArmId: string,
  ): Promise<SubjectClassAssessmentData> {
    const schoolId = await this.getUserSchoolId(userId);

    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
      include: {
        terms: { where: { isCurrent: true }, take: 1 },
      },
    });

    if (!currentSession) {
      throw new NotFoundException('No active academic session found');
    }

    const currentTerm = currentSession.terms[0];
    if (!currentTerm) {
      throw new NotFoundException('No active term found');
    }

    // Get subject
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Get class arm
    const classArm = await this.prisma.classArm.findFirst({
      where: { id: classArmId, academicSessionId: currentSession.id, deletedAt: null },
      include: {
        level: true,
        classArmStudents: {
          where: { isActive: true },
          include: {
            student: {
              include: { user: { select: { firstName: true, lastName: true, avatarUrl: true, gender: true } } },
            },
          },
        },
      },
    });

    if (!classArm) {
      throw new NotFoundException('Class not found');
    }

    // Find the ClassArmSubject for this class-subject pair
    const classArmSubject = await this.prisma.classArmSubject.findFirst({
      where: { classArmId, subjectId, deletedAt: null },
      include: {
        teachers: {
          where: { deletedAt: null },
          include: {
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          take: 1,
        },
      },
    });

    const teacher = classArmSubject?.teachers[0];

    // Get assessment structure
    const template = await this.templateService.findActiveTemplateForSchoolSession(
      schoolId,
      currentSession.id,
    );
    const assessmentTypes = (template?.assessments as any[]) || [];
    const sortedAssessments = assessmentTypes
      .filter((a: any) => a.isActive !== false)
      .sort((a: any, b: any) => a.order - b.order);

    // Get grading model
    const gradingModel = await this.prisma.gradingModel.findFirst({
      where: { schoolId, deletedAt: null },
    });

    // Build student data
    const students = classArm.classArmStudents.map((cas) => {
      const student = cas.student;
      const fullName = `${student.user.firstName} ${student.user.lastName}`;
      return {
        id: student.id,
        studentNo: student.studentNo,
        fullName,
        gender: student.user.gender || '',
        avatarUrl: student.user.avatarUrl || null,
        assessments: [] as any[],
        totalScore: 0,
        averageScore: 0,
        grade: undefined as string | undefined,
      };
    });

    const totalMaxScore = sortedAssessments.reduce((sum: number, a: any) => sum + (a.maxScore || 0), 0);

    // If we have a ClassArmSubject, fetch assessments directly
    if (classArmSubject) {
      const assessmentRecords = await this.prisma.classArmStudentAssessment.findMany({
        where: {
          classArmSubjectId: classArmSubject.id,
          studentId: { in: students.map((s) => s.id) },
          deletedAt: null,
        },
      });

      // Group assessments by student
      const studentAssessmentMap = new Map<string, typeof assessmentRecords>();
      for (const record of assessmentRecords) {
        const existing = studentAssessmentMap.get(record.studentId) || [];
        existing.push(record);
        studentAssessmentMap.set(record.studentId, existing);
      }

      for (const student of students) {
        const studentAssessments = studentAssessmentMap.get(student.id);
        if (studentAssessments && studentAssessments.length > 0) {
          // Build a map by assessment name (unique constraint prevents dupes)
          const assessmentsByName = new Map<string, (typeof assessmentRecords)[0]>();
          for (const assessment of studentAssessments) {
            assessmentsByName.set(assessment.name, assessment);
          }

          // Map assessments to structure
          student.assessments = sortedAssessments.map((structure: any) => {
            const assessment = assessmentsByName.get(structure.name);
            const score = assessment?.score ?? 0;
            const maxScore = assessment?.maxScore || structure.maxScore || 0;
            return {
              id: assessment?.id || '',
              name: structure.name,
              score,
              maxScore,
              percentage: maxScore > 0 ? Math.round((score / maxScore) * 100 * 100) / 100 : 0,
              isExam: structure.isExam || false,
            };
          });

          const allScores = Array.from(assessmentsByName.values());
          student.totalScore = allScores.reduce((sum, a) => sum + a.score, 0);
          const totalPercentage = totalMaxScore > 0
            ? (student.totalScore / totalMaxScore) * 100
            : 0;
          student.averageScore = Math.round(totalPercentage * 100) / 100;
          student.grade = this.calculateGradeFromModel(totalPercentage, gradingModel?.model);
        }
      }
    }

    // Compute class stats
    const studentsWithScores = students.filter((s) => s.totalScore > 0);
    const averageScore = studentsWithScores.length > 0
      ? Math.round(studentsWithScores.reduce((sum, s) => sum + s.averageScore, 0) / studentsWithScores.length * 100) / 100
      : 0;
    const highestScore = studentsWithScores.length > 0
      ? Math.max(...studentsWithScores.map((s) => s.averageScore))
      : 0;
    const lowestScore = studentsWithScores.length > 0
      ? Math.min(...studentsWithScores.map((s) => s.averageScore))
      : 0;
    const passRate = students.length > 0
      ? Math.round((studentsWithScores.filter((s) => s.averageScore >= 50).length / students.length) * 100 * 100) / 100
      : 0;

    return {
      subject: { id: subject.id, name: subject.name },
      classArm: {
        id: classArm.id,
        name: classArm.name,
        levelName: classArm.level?.name || '',
      },
      academicSession: { id: currentSession.id, name: currentSession.academicYear },
      currentTerm: { id: currentTerm.id, name: currentTerm.name },
      teacher: teacher?.teacher?.user
        ? { id: teacher.teacherId, name: `${teacher.teacher.user.firstName} ${teacher.teacher.user.lastName}` }
        : null,
      assessmentStructure: sortedAssessments.map((a: any) => ({
        id: a.id,
        name: a.name,
        maxScore: a.maxScore,
        isExam: a.isExam || false,
        order: a.order,
      })),
      classStats: {
        totalStudents: students.length,
        averageScore,
        highestScore,
        lowestScore,
        passRate,
      },
      students,
      gradingModel: (gradingModel?.model as Record<string, [number, number]>) || null,
    };
  }

  async generateBroadsheet(
    userId: string,
    subjectId: string,
    classArmId: string,
  ): Promise<Buffer> {
    const schoolId = await this.getUserSchoolId(userId);

    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
      include: {
        terms: { orderBy: { startDate: 'asc' } },
      },
    });

    if (!currentSession) {
      throw new NotFoundException('No active academic session found');
    }

    const currentTerm = currentSession.terms.find((t) => t.isCurrent);
    if (!currentTerm) {
      throw new NotFoundException('No active term found');
    }

    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId, deletedAt: null },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const classArm = await this.prisma.classArm.findFirst({
      where: { id: classArmId, academicSessionId: currentSession.id, deletedAt: null },
      include: {
        level: true,
        classArmStudents: {
          where: { isActive: true },
          include: {
            student: {
              include: { user: { select: { firstName: true, lastName: true, gender: true } } },
            },
          },
        },
      },
    });
    if (!classArm) throw new NotFoundException('Class not found');

    // Get assessment structure for current term
    const template = await this.templateService.findActiveTemplateForSchoolSession(schoolId, currentSession.id);
    const assessmentTypes = ((template?.assessments as any[]) || [])
      .filter((a: any) => a.isActive !== false)
      .sort((a: any, b: any) => a.order - b.order);

    // Get grading model
    const gradingModel = await this.prisma.gradingModel.findFirst({
      where: { schoolId, deletedAt: null },
    });

    // Separate previous terms from current term
    const previousTerms = currentSession.terms.filter((t) => t.id !== currentTerm.id);
    const allTerms = currentSession.terms;

    // Find the ClassArmSubject for this class-subject pair
    const classArmSubject = await this.prisma.classArmSubject.findFirst({
      where: { classArmId, subjectId, deletedAt: null },
    });

    // For each student, gather data per term
    type StudentRow = {
      name: string;
      studentNo: string;
      gender: string;
      termTotals: Map<string, number>; // termId -> total
      currentTermAssessments: Map<string, number>; // assessmentName -> score
      currentTermTotal: number;
      average: number;
      rank: number;
      remarks: string;
    };

    const studentRows: StudentRow[] = [];

    for (const cas of classArm.classArmStudents) {
      const student = cas.student;
      const row: StudentRow = {
        name: `${student.user.firstName} ${student.user.lastName}`,
        studentNo: student.studentNo,
        gender: student.user.gender || '',
        termTotals: new Map(),
        currentTermAssessments: new Map(),
        currentTermTotal: 0,
        average: 0,
        rank: 0,
        remarks: '',
      };

      if (classArmSubject) {
        // Fetch all assessments for this student grouped by term
        const assessments = await this.prisma.classArmStudentAssessment.findMany({
          where: {
            classArmSubjectId: classArmSubject.id,
            studentId: student.id,
            termId: { in: allTerms.map((t) => t.id) },
            deletedAt: null,
          },
        });

        // Group by termId
        const assessmentsByTerm = new Map<string, typeof assessments>();
        for (const assessment of assessments) {
          const existing = assessmentsByTerm.get(assessment.termId) || [];
          existing.push(assessment);
          assessmentsByTerm.set(assessment.termId, existing);
        }

        for (const [termId, termAssessments] of assessmentsByTerm) {
          const total = termAssessments.reduce((sum, a) => sum + a.score, 0);
          row.termTotals.set(termId, total);

          if (termId === currentTerm.id) {
            row.currentTermTotal = total;
            for (const assessment of termAssessments) {
              row.currentTermAssessments.set(assessment.name, assessment.score);
            }
          }
        }
      }

      // Calculate average across all terms with scores
      const termScores: number[] = [];
      for (const term of allTerms) {
        const total = row.termTotals.get(term.id);
        if (total !== undefined) {
          termScores.push(total);
        }
      }
      row.average = termScores.length > 0
        ? Math.round((termScores.reduce((a, b) => a + b, 0) / termScores.length) * 100) / 100
        : 0;

      studentRows.push(row);
    }

    // Calculate ranks (dense ranking by average descending)
    const sorted = [...studentRows].sort((a, b) => b.average - a.average);
    let rank = 0;
    let prevAvg = -1;
    for (const row of sorted) {
      if (row.average !== prevAvg) {
        rank++;
        prevAvg = row.average;
      }
      row.rank = rank;
    }

    // Calculate total max score for percentage
    const totalMaxScore = assessmentTypes.reduce((sum: number, a: any) => sum + (a.maxScore || 0), 0);

    // Assign remarks based on grading model
    for (const row of studentRows) {
      const percentage = totalMaxScore > 0 ? (row.average / totalMaxScore) * 100 : 0;
      row.remarks = this.calculateGradeFromModel(percentage, gradingModel?.model);
    }

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Broadsheet');

    // Build header row
    const headers: string[] = ['S/N', 'Student Name', 'Student No', 'Gender'];
    for (const term of previousTerms) {
      headers.push(`${term.name} Total`);
    }
    for (const at of assessmentTypes) {
      headers.push(at.name);
    }
    headers.push('Current Term Total', 'Average', 'Rank', 'Remarks');

    // Add title row
    const titleRow = sheet.addRow([
      `Broadsheet - ${subject.name} - ${classArm.level?.name || ''} ${classArm.name} - ${currentSession.academicYear}`,
    ]);
    sheet.mergeCells(1, 1, 1, headers.length);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };

    // Add empty row
    sheet.addRow([]);

    // Add header row
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', wrapText: true };
    });

    // Add data rows
    studentRows.forEach((row, index) => {
      const rowData: (string | number)[] = [
        index + 1,
        row.name,
        row.studentNo,
        row.gender,
      ];

      for (const term of previousTerms) {
        rowData.push(row.termTotals.get(term.id) ?? '-' as any);
      }

      for (const at of assessmentTypes) {
        rowData.push(row.currentTermAssessments.get(at.name) ?? '-' as any);
      }

      rowData.push(row.currentTermTotal, row.average, row.rank, row.remarks);

      const dataRow = sheet.addRow(rowData);
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { horizontal: 'center' };
      });
      // Left-align name
      dataRow.getCell(2).alignment = { horizontal: 'left' };
    });

    // Auto-fit columns
    sheet.columns.forEach((col) => {
      let maxWidth = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > maxWidth) maxWidth = len;
      });
      col.width = Math.min(maxWidth + 2, 30);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private calculateGradeFromModel(score: number, gradingModel: any): string {
    if (!gradingModel || typeof gradingModel !== 'object') {
      if (score >= 90) return 'A+';
      if (score >= 80) return 'A';
      if (score >= 70) return 'B';
      if (score >= 60) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    }

    for (const [grade, range] of Object.entries(gradingModel)) {
      if (Array.isArray(range) && range.length === 2) {
        const [min, max] = range as [number, number];
        if (score >= min && score <= max) {
          return grade;
        }
      }
    }

    return 'F';
  }
}
