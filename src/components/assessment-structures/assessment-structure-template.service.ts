import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAssessmentStructureTemplateDto,
  UpdateAssessmentStructureTemplateDto,
} from './dto/assessment-structure-template.dto';
import { AssessmentDetailDto } from './dto/assessment-detail.dto';
import { randomUUID } from 'crypto';

interface AssessmentEntry {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  isExam: boolean;
  order: number;
}

@Injectable()
export class AssessmentStructureTemplateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ensures every assessment in the array has a UUID.
   * Preserves existing IDs, generates new ones for entries without.
   */
  private ensureAssessmentIds(assessments: AssessmentDetailDto[]): AssessmentEntry[] {
    return assessments.map((a) => ({
      id: a.id || randomUUID(),
      name: a.name,
      description: a.description,
      maxScore: a.maxScore,
      isExam: a.isExam,
      order: a.order,
    }));
  }

  async create(userId: string, createDto: CreateAssessmentStructureTemplateDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.validateTotalScore(createDto.assessments);
    this.validateUniqueNames(createDto.assessments);

    const existingTemplate = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        schoolId: user.schoolId,
        academicSessionId: createDto.academicSessionId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (existingTemplate) {
      throw new ConflictException(
        'An active assessment structure template already exists for this academic session',
      );
    }

    const assessmentsWithIds = this.ensureAssessmentIds(createDto.assessments);

    const template = await this.prisma.assessmentStructureTemplate.create({
      data: {
        schoolId: user.schoolId,
        academicSessionId: createDto.academicSessionId,
        name: createDto.name,
        description: createDto.description,
        assessments: assessmentsWithIds as any,
        isActive: true,
      },
    });

    return template;
  }

  async findActiveForSession(userId: string, academicSessionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let template = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        schoolId: user.schoolId,
        academicSessionId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!template) {
      template = await this.createAssessmentStructureForSession(user.schoolId, academicSessionId);
    }

    // Ensure all assessments have IDs (backfill for legacy templates)
    const assessments = template.assessments as any[];
    if (assessments.some((a: any) => !a.id)) {
      const assessmentsWithIds = this.ensureAssessmentIds(assessments);
      template = await this.prisma.assessmentStructureTemplate.update({
        where: { id: template.id },
        data: { assessments: assessmentsWithIds as any },
      });
    }

    return template;
  }

  async update(userId: string, id: string, updateDto: UpdateAssessmentStructureTemplateDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundException('Assessment structure template not found');
    }

    if (updateDto.assessments) {
      this.validateTotalScore(updateDto.assessments);
      this.validateUniqueNames(updateDto.assessments);

      // Validate that in-use assessment types are not removed
      await this.validateAssessmentsNotInUse(template, updateDto.assessments);

      // Preserve existing UUIDs for assessments that match by ID or name
      const existingAssessments = template.assessments as unknown as AssessmentEntry[];
      const renamedAssessments: { assessmentTypeId: string; oldName: string; newName: string }[] = [];

      const newAssessments = updateDto.assessments.map((a) => {
        // First try to match by existing ID
        if (a.id) {
          const existing = existingAssessments.find((e) => e.id === a.id);
          if (existing) {
            // Track renames so we can propagate to existing score records
            if (existing.name !== a.name) {
              renamedAssessments.push({
                assessmentTypeId: existing.id,
                oldName: existing.name,
                newName: a.name,
              });
            }
            return { ...a, id: existing.id };
          }
        }
        // Fall back to matching by name to preserve UUID across renames
        const existingByName = existingAssessments.find((e) => e.name === a.name);
        return {
          id: a.id || (existingByName?.id) || randomUUID(),
          name: a.name,
          description: a.description,
          maxScore: a.maxScore,
          isExam: a.isExam,
          order: a.order,
        };
      });

      updateDto.assessments = newAssessments as any;

      // Propagate name changes to existing score records so they remain visible
      for (const rename of renamedAssessments) {
        await this.prisma.subjectTermStudentAssessment.updateMany({
          where: {
            assessmentTypeId: rename.assessmentTypeId,
            deletedAt: null,
          },
          data: {
            name: rename.newName,
          },
        });
      }
    }

    const updatedTemplate = await this.prisma.assessmentStructureTemplate.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.description !== undefined && { description: updateDto.description }),
        ...(updateDto.assessments && { assessments: updateDto.assessments as any }),
      },
    });

    return updatedTemplate;
  }

  async delete(userId: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundException('Assessment structure template not found');
    }

    await this.validateTemplateNotInUse(id, user.schoolId);

    await this.prisma.assessmentStructureTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { message: 'Assessment structure template deleted successfully' };
  }

  async createGlobalDefault() {
    const defaultAssessments: AssessmentEntry[] = [
      {
        id: randomUUID(),
        name: 'Test 1',
        description: 'First continuous assessment',
        maxScore: 20,
        isExam: false,
        order: 1,
      },
      {
        id: randomUUID(),
        name: 'Test 2',
        description: 'Second continuous assessment',
        maxScore: 20,
        isExam: false,
        order: 2,
      },
      {
        id: randomUUID(),
        name: 'Exam',
        description: 'Final examination',
        maxScore: 60,
        isExam: true,
        order: 3,
      },
    ];

    const existingDefault = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        isGlobalDefault: true,
        isActive: true,
        deletedAt: null,
      },
    });

    if (existingDefault) {
      throw new ConflictException('Global default assessment structure template already exists');
    }

    try {
      const globalDefault = await this.prisma.assessmentStructureTemplate.create({
        data: {
          schoolId: null,
          academicSessionId: null,
          name: 'Global Default Assessment Structure',
          description: 'Default assessment structure for new schools',
          assessments: defaultAssessments as any,
          isActive: true,
          isGlobalDefault: true,
        },
      });

      return globalDefault;
    } catch (error) {
      console.error('Error creating global default template:', error);
      throw new ConflictException(
        'Failed to create global default template. It may already exist.',
      );
    }
  }

  /**
   * Find the active template for a given school and session.
   * Used by other services (BFF, Excel upload) to look up assessment types.
   * Auto-creates a template if none exists (safe for current/new sessions).
   */
  async findActiveTemplateForSchoolSession(schoolId: string, academicSessionId: string) {
    let template = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        schoolId,
        academicSessionId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!template) {
      template = await this.createAssessmentStructureForSession(schoolId, academicSessionId);
    }

    // Ensure all assessments have IDs
    const assessments = template.assessments as any[];
    if (assessments.some((a: any) => !a.id)) {
      const assessmentsWithIds = this.ensureAssessmentIds(assessments);
      template = await this.prisma.assessmentStructureTemplate.update({
        where: { id: template.id },
        data: { assessments: assessmentsWithIds as any },
      });
    }

    return template;
  }

  /**
   * Find the template for a historical session without auto-creating.
   * Used when viewing past results — we must never fabricate a template
   * from the current session for historical data.
   * Returns null if no template exists for that session.
   */
  async findTemplateForSessionReadOnly(schoolId: string, academicSessionId: string) {
    const template = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        schoolId,
        academicSessionId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!template) return null;

    // Backfill IDs if needed (safe mutation — just adds missing UUIDs)
    const assessments = template.assessments as any[];
    if (assessments.some((a: any) => !a.id)) {
      const assessmentsWithIds = this.ensureAssessmentIds(assessments);
      return await this.prisma.assessmentStructureTemplate.update({
        where: { id: template.id },
        data: { assessments: assessmentsWithIds as any },
      });
    }

    return template;
  }

  /**
   * Get the assessment entry from the template by name (case-insensitive).
   */
  getAssessmentEntryByName(template: any, assessmentName: string): AssessmentEntry | undefined {
    const assessments = template.assessments as unknown as AssessmentEntry[];
    return assessments.find(
      (a) => a.name.toLowerCase() === assessmentName.toLowerCase(),
    );
  }

  /**
   * Get the assessment entry from the template by ID.
   */
  getAssessmentEntryById(template: any, assessmentTypeId: string): AssessmentEntry | undefined {
    const assessments = template.assessments as unknown as AssessmentEntry[];
    return assessments.find((a) => a.id === assessmentTypeId);
  }

  private validateTotalScore(assessments: AssessmentDetailDto[]) {
    const totalScore = assessments.reduce((sum, assessment) => sum + assessment.maxScore, 0);
    if (totalScore !== 100) {
      throw new BadRequestException(`Total score must be exactly 100%, got ${totalScore}%`);
    }
  }

  private validateUniqueNames(assessments: AssessmentDetailDto[]) {
    const names = assessments.map((a) => a.name.toLowerCase());
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      throw new BadRequestException(
        `Duplicate assessment names found: ${duplicateNames.join(', ')}`,
      );
    }
  }

  /**
   * Check if the template has any recorded scores across all its assessment types.
   */
  async hasRecordedScores(template: any): Promise<boolean> {
    const assessments = template.assessments as unknown as AssessmentEntry[];
    const assessmentTypeIds = assessments.map((a) => a.id).filter(Boolean);

    if (assessmentTypeIds.length === 0) return false;

    const count = await this.prisma.subjectTermStudentAssessment.count({
      where: {
        assessmentTypeId: { in: assessmentTypeIds },
        deletedAt: null,
      },
    });

    return count > 0;
  }

  /**
   * Validates that structural changes (add/remove assessments, change maxScore)
   * are not made when scores already exist. Only renames and description/order
   * changes are allowed when scores exist.
   */
  private async validateAssessmentsNotInUse(template: any, newAssessments: AssessmentDetailDto[]) {
    const existingAssessments = template.assessments as unknown as AssessmentEntry[];
    const scoresExist = await this.hasRecordedScores(template);

    if (!scoresExist) return; // No scores — all changes allowed

    // Scores exist: block structural changes

    // 1. Block adding new assessment types
    if (newAssessments.length !== existingAssessments.length) {
      throw new BadRequestException(
        `Cannot add or remove assessment types — scores have already been recorded. ` +
        `You can rename assessments or change descriptions, but the structure must remain the same.`,
      );
    }

    // 2. Block removal of existing assessment types (replaced by different ones)
    const existingIds = new Set(existingAssessments.map((a) => a.id).filter(Boolean));
    const newIds = new Set(newAssessments.map((a) => a.id).filter(Boolean));

    for (const existing of existingAssessments) {
      if (existing.id && !newIds.has(existing.id)) {
        throw new BadRequestException(
          `Cannot remove assessment "${existing.name}" — it has recorded scores. ` +
          `You can rename it, but cannot remove it while scores exist.`,
        );
      }
    }

    // 3. Block maxScore changes on existing assessments
    for (const newAssessment of newAssessments) {
      if (newAssessment.id) {
        const existing = existingAssessments.find((e) => e.id === newAssessment.id);
        if (existing && existing.maxScore !== newAssessment.maxScore) {
          throw new BadRequestException(
            `Cannot change max score for "${existing.name}" from ${existing.maxScore} to ${newAssessment.maxScore} — ` +
            `scores have already been recorded with the current max score.`,
          );
        }
      }
    }
  }

  private async validateTemplateNotInUse(templateId: string, schoolId: string) {
    const template = await this.prisma.assessmentStructureTemplate.findFirst({
      where: { id: templateId, deletedAt: null },
    });

    if (!template) return;

    const assessments = template.assessments as unknown as AssessmentEntry[];
    const assessmentTypeIds = assessments.map((a) => a.id).filter(Boolean);

    if (assessmentTypeIds.length === 0) return;

    const inUseCount = await this.prisma.subjectTermStudentAssessment.count({
      where: {
        assessmentTypeId: { in: assessmentTypeIds },
        deletedAt: null,
      },
    });

    if (inUseCount > 0) {
      throw new BadRequestException(
        `Cannot delete this template - it has ${inUseCount} recorded assessment scores. ` +
        `You can modify the template, but cannot delete it while scores exist.`,
      );
    }
  }

  /**
   * Creates assessment structure template for a session if none exists.
   * Tries: 1) copy from previous session template, 2) global default, 3) hardcoded defaults.
   * No longer creates individual AssessmentStructure rows — only the template with UUIDs.
   */
  private async createAssessmentStructureForSession(schoolId: string, academicSessionId: string) {
    // Try to find a template from the most recent previous session
    const previousTemplate = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        schoolId,
        academicSessionId: { not: academicSessionId },
        isActive: true,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (previousTemplate) {
      // Copy from previous session but with fresh UUIDs
      const previousAssessments = previousTemplate.assessments as unknown as AssessmentEntry[];
      const newAssessments = previousAssessments.map((a) => ({
        ...a,
        id: randomUUID(), // Fresh UUIDs for the new session
      }));

      return await this.prisma.assessmentStructureTemplate.create({
        data: {
          schoolId,
          academicSessionId,
          name: previousTemplate.name,
          description: previousTemplate.description,
          assessments: newAssessments as any,
          isActive: true,
        },
      });
    }

    // Try global default template
    const globalDefault = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        isGlobalDefault: true,
        isActive: true,
        deletedAt: null,
      },
    });

    if (globalDefault) {
      const defaultAssessments = globalDefault.assessments as unknown as AssessmentEntry[];
      const newAssessments = defaultAssessments.map((a) => ({
        ...a,
        id: randomUUID(),
      }));

      return await this.prisma.assessmentStructureTemplate.create({
        data: {
          schoolId,
          academicSessionId,
          name: globalDefault.name,
          description: globalDefault.description,
          assessments: newAssessments as any,
          isActive: true,
        },
      });
    }

    // Fallback to hardcoded defaults
    const defaultAssessments: AssessmentEntry[] = [
      {
        id: randomUUID(),
        name: 'CA 1',
        description: 'First continuous assessment test',
        maxScore: 20,
        isExam: false,
        order: 1,
      },
      {
        id: randomUUID(),
        name: 'CA 2',
        description: 'Second continuous assessment test',
        maxScore: 20,
        isExam: false,
        order: 2,
      },
      {
        id: randomUUID(),
        name: 'Exam',
        description: 'Final examination',
        maxScore: 60,
        isExam: true,
        order: 3,
      },
    ];

    return await this.prisma.assessmentStructureTemplate.create({
      data: {
        schoolId,
        academicSessionId,
        name: 'Standard Assessment Structure',
        description: 'Standard assessment structure for all subjects',
        assessments: defaultAssessments as any,
        isActive: true,
      },
    });
  }
}
