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
        classArmSubjectTeachers: {
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
      // Calculate classes count (unique class arms teaching this subject)
      const uniqueClasses = new Set(subject.classArmSubjectTeachers.map((cast) => cast.classArmId));
      const classesCount = uniqueClasses.size;

      // Calculate student count (total students in all classes taking this subject)
      const studentCount = subject.classArmSubjectTeachers.reduce(
        (total, cast) => total + cast.classArm.classArmStudents.length,
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
      const assessmentCount = await this.prisma.subjectTermStudentAssessment.count({
        where: {
          subjectTermStudent: {
            subjectTerm: {
              subjectId,
              academicSession: { schoolId },
            },
          },
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
        subjectTerms: {
          include: {
            subjectTermStudents: {
              include: {
                assessments: true,
              },
            },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Check if subject has any assessments
    const hasAssessments = subject.subjectTerms.some((subjectTerm) =>
      subjectTerm.subjectTermStudents.some((student) => student.assessments.length > 0),
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

    // Get subject with teacher-class assignments
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId, deletedAt: null },
      include: {
        department: true,
        category: true,
        classArmSubjectTeachers: {
          where: {
            deletedAt: null,
            classArm: { academicSessionId: currentSession.id, deletedAt: null },
          },
          include: {
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
            classArm: {
              include: {
                level: true,
                classArmStudents: { where: { isActive: true } },
              },
            },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Build classes map from teacher assignments
    const classesMap = new Map<string, {
      classArmId: string;
      classArmName: string;
      levelName: string;
      teacherName: string | null;
      teacherId: string | null;
      studentCount: number;
      hasAssessments: boolean;
    }>();

    for (const cast of subject.classArmSubjectTeachers) {
      const classArmId = cast.classArmId;
      if (!classesMap.has(classArmId)) {
        classesMap.set(classArmId, {
          classArmId,
          classArmName: cast.classArm.name,
          levelName: cast.classArm.level?.name || '',
          teacherName: cast.teacher?.user
            ? `${cast.teacher.user.firstName} ${cast.teacher.user.lastName}`
            : null,
          teacherId: cast.teacherId,
          studentCount: cast.classArm.classArmStudents.length,
          hasAssessments: false,
        });
      }
    }

    // Find classes with assessment records (even without teacher assignments)
    const subjectTerms = await this.prisma.subjectTerm.findMany({
      where: {
        subjectId,
        academicSessionId: currentSession.id,
      },
      include: {
        subjectTermStudents: {
          where: { deletedAt: null },
          include: {
            assessments: { where: { deletedAt: null }, select: { id: true } },
            student: {
              include: {
                classArmStudents: {
                  where: { isActive: true },
                  include: {
                    classArm: { include: { level: true, classArmStudents: { where: { isActive: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Track which classArms have assessments
    for (const st of subjectTerms) {
      for (const sts of st.subjectTermStudents) {
        if (sts.assessments.length > 0) {
          const classArmStudent = sts.student.classArmStudents[0];
          if (classArmStudent) {
            const classArmId = classArmStudent.classArmId;
            if (classesMap.has(classArmId)) {
              classesMap.get(classArmId)!.hasAssessments = true;
            } else {
              classesMap.set(classArmId, {
                classArmId,
                classArmName: classArmStudent.classArm.name,
                levelName: classArmStudent.classArm.level?.name || '',
                teacherName: null,
                teacherId: null,
                studentCount: classArmStudent.classArm.classArmStudents.length,
                hasAssessments: true,
              });
            }
          }
        }
      }
    }

    // Check if subject has any assessment scores at all (for edit guard)
    const hasAssessmentScores = await this.prisma.subjectTermStudentAssessment.count({
      where: {
        subjectTermStudent: {
          subjectTerm: { subjectId, academicSession: { schoolId } },
        },
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
      classes: Array.from(classesMap.values()),
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

    // Get teacher for this subject-class
    const cast = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { subjectId, classArmId, deletedAt: null },
      include: { teacher: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });

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

    // Get ALL SubjectTerms for this subject in the current session (all terms)
    // This matches the teacher's query pattern which doesn't filter by termId
    const subjectTerms = await this.prisma.subjectTerm.findMany({
      where: {
        subjectId,
        academicSessionId: currentSession.id,
      },
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

    // If we have subjectTerms, fetch all student assessment data
    if (subjectTerms.length > 0) {
      const subjectTermStudents = await this.prisma.subjectTermStudent.findMany({
        where: {
          subjectTermId: { in: subjectTerms.map((st) => st.id) },
          deletedAt: null,
          studentId: { in: students.map((s) => s.id) },
        },
        include: {
          assessments: { where: { deletedAt: null } },
          subjectTerm: true,
        },
      });

      // Group by student, then deduplicate assessments by name (keep most recent)
      const studentStsMap = new Map<string, typeof subjectTermStudents>();
      for (const sts of subjectTermStudents) {
        const existing = studentStsMap.get(sts.studentId) || [];
        existing.push(sts);
        studentStsMap.set(sts.studentId, existing);
      }

      const totalMaxScore = sortedAssessments.reduce((sum: number, a: any) => sum + (a.maxScore || 0), 0);

      for (const student of students) {
        const stsRecords = studentStsMap.get(student.id);
        if (stsRecords && stsRecords.length > 0) {
          // Aggregate all assessments across all SubjectTermStudent records
          const allAssessments: any[] = [];
          for (const sts of stsRecords) {
            allAssessments.push(...sts.assessments);
          }

          // Deduplicate by assessment name (keep the most recent by updatedAt)
          const assessmentsByName = new Map<string, any>();
          for (const assessment of allAssessments) {
            if (assessment.deletedAt) continue;
            const existing = assessmentsByName.get(assessment.name);
            if (!existing || new Date(assessment.updatedAt) > new Date(existing.updatedAt)) {
              assessmentsByName.set(assessment.name, assessment);
            }
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

          const dedupedAssessments = Array.from(assessmentsByName.values());
          student.totalScore = dedupedAssessments.reduce((sum, a) => sum + a.score, 0);
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
      teacher: cast?.teacher?.user
        ? { id: cast.teacherId, name: `${cast.teacher.user.firstName} ${cast.teacher.user.lastName}` }
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

    // Fetch SubjectTerms for all terms
    const subjectTerms = await this.prisma.subjectTerm.findMany({
      where: {
        subjectId,
        academicSessionId: currentSession.id,
        termId: { in: allTerms.map((t) => t.id) },
      },
    });

    const subjectTermMap = new Map(subjectTerms.map((st) => [st.termId, st]));

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

      // Fetch all SubjectTermStudent records for this student across all terms
      const stsRecords = await this.prisma.subjectTermStudent.findMany({
        where: {
          studentId: student.id,
          subjectTermId: { in: subjectTerms.map((st) => st.id) },
          deletedAt: null,
        },
        include: {
          assessments: { where: { deletedAt: null } },
          subjectTerm: true,
        },
      });

      for (const sts of stsRecords) {
        const termId = sts.subjectTerm.termId;
        const total = sts.assessments.reduce((sum, a) => sum + a.score, 0);
        row.termTotals.set(termId, total);

        if (termId === currentTerm.id) {
          row.currentTermTotal = total;
          for (const assessment of sts.assessments) {
            row.currentTermAssessments.set(assessment.name, assessment.score);
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
