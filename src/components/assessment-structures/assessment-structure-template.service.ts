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

@Injectable()
export class AssessmentStructureTemplateService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateAssessmentStructureTemplateDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate total score
    this.validateTotalScore(createDto.assessments);

    // Validate unique names
    this.validateUniqueNames(createDto.assessments);

    // Check if there's already an active template for this session
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

    // Create the template
    const template = await this.prisma.assessmentStructureTemplate.create({
      data: {
        schoolId: user.schoolId,
        academicSessionId: createDto.academicSessionId,
        name: createDto.name,
        description: createDto.description,
        assessments: createDto.assessments as any, // Store as JSON
        isActive: true,
      },
    });

    return template;
  }

  async findActiveForSession(userId: string, academicSessionId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find active template for the session
    let template = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        schoolId: user.schoolId,
        academicSessionId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!template) {
      // If no template exists, create one automatically
      template = await this.createAssessmentStructureForSession(user.schoolId, academicSessionId);
    }

    return template;
  }

  async update(userId: string, id: string, updateDto: UpdateAssessmentStructureTemplateDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find the template
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

    // If updating assessments, validate them
    if (updateDto.assessments) {
      this.validateTotalScore(updateDto.assessments);
      this.validateUniqueNames(updateDto.assessments);

      // Check if any assessments are in use (if scores are being changed)
      await this.validateAssessmentsNotInUse(template, updateDto.assessments);
    }

    // Update the template
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
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find the template
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

    // Check if template is in use
    await this.validateTemplateNotInUse(id, user.schoolId);

    // Soft delete the template
    await this.prisma.assessmentStructureTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Assessment structure template deleted successfully' };
  }

  async createGlobalDefault() {
    const defaultAssessments: AssessmentDetailDto[] = [
      {
        name: 'Test 1',
        description: 'First continuous assessment',
        maxScore: 20,
        isExam: false,
        order: 1,
      },
      {
        name: 'Test 2',
        description: 'Second continuous assessment',
        maxScore: 20,
        isExam: false,
        order: 2,
      },
      { name: 'Exam', description: 'Final examination', maxScore: 60, isExam: true, order: 3 },
    ];

    // Check if global default already exists
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

    // Create global default (no school or session required)
    try {
      const globalDefault = await this.prisma.assessmentStructureTemplate.create({
        data: {
          schoolId: null, // Null for global default
          academicSessionId: null, // Null for global default
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

  private validateTotalScore(assessments: AssessmentDetailDto[]) {
    const totalScore = assessments.reduce((sum, assessment) => sum + assessment.maxScore, 0);
    if (totalScore !== 100) {
      throw new BadRequestException(`Total score must be exactly 100%, got ${totalScore}%`);
    }
  }

  private validateUniqueNames(assessments: AssessmentDetailDto[]) {
    const names = assessments.map((a) => a.name);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      throw new BadRequestException(
        `Duplicate assessment names found: ${duplicateNames.join(', ')}`,
      );
    }
  }

  private async validateAssessmentsNotInUse(template: any, newAssessments: AssessmentDetailDto[]) {
    // This would check if any student assessments are using the old structure
    // For now, we'll implement a basic check
    // In a real implementation, you'd check the SubjectTermStudentAssessment table
    // TODO: Implement actual validation against student assessments
    // This is a placeholder for the actual implementation
  }

  private async validateTemplateNotInUse(templateId: string, schoolId: string) {
    // This would check if the template is being used by any assessments
    // For now, we'll implement a basic check
    // In a real implementation, you'd check if any assessments reference this template
    // TODO: Implement actual validation against assessments
    // This is a placeholder for the actual implementation
  }

  private async createFromGlobalDefault(
    schoolId: string,
    academicSessionId: string,
    globalDefault: any,
  ) {
    // Create assessment structures from global default
    const defaultStructures = globalDefault.assessments as any[];

    // Create individual assessment structures
    for (const structure of defaultStructures) {
      await this.prisma.assessmentStructure.create({
        data: {
          schoolId,
          academicSessionId,
          name: structure.name,
          description: structure.description,
          maxScore: structure.maxScore,
          isExam: structure.isExam,
          order: structure.order,
          isActive: true,
        },
      });
    }

    // Create a copy of the global default template for this school/session
    const template = await this.prisma.assessmentStructureTemplate.create({
      data: {
        schoolId,
        academicSessionId,
        name: globalDefault.name,
        description: globalDefault.description,
        assessments: globalDefault.assessments,
        isActive: true,
      },
    });

    return template;
  }

  /**
   * Creates assessment structure template and structures for a session if they don't exist.
   * Tries to inherit from previous session, then global default, then uses hardcoded defaults.
   */
  private async createAssessmentStructureForSession(schoolId: string, academicSessionId: string) {
    // Check if assessment structures already exist
    const existingStructures = await this.prisma.assessmentStructure.findMany({
      where: {
        schoolId,
        academicSessionId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (existingStructures.length > 0) {
      // Structures exist but template might be missing, create template from structures
      const assessments = existingStructures.map((s) => ({
        name: s.name,
        description: s.description,
        maxScore: s.maxScore,
        isExam: s.isExam,
        order: s.order,
      }));

      return await this.prisma.assessmentStructureTemplate.create({
        data: {
          schoolId,
          academicSessionId,
          name: 'Standard Assessment Structure',
          description: 'Standard assessment structure for all subjects',
          assessments: assessments as any,
          isActive: true,
        },
      });
    }

    // Try to find the most recent session's assessment structures to copy from
    const mostRecentSessionWithStructures = await this.prisma.academicSession.findFirst({
      where: {
        schoolId,
        id: { not: academicSessionId },
        assessmentStructures: {
          some: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        assessmentStructures: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (mostRecentSessionWithStructures?.assessmentStructures?.length > 0) {
      // Copy assessment structures from previous session
      const structuresToCreate = [];
      for (const structure of mostRecentSessionWithStructures.assessmentStructures) {
        await this.prisma.assessmentStructure.create({
          data: {
            schoolId,
            academicSessionId,
            name: structure.name,
            description: structure.description,
            maxScore: structure.maxScore,
            isExam: structure.isExam,
            order: structure.order,
            isActive: true,
          },
        });
        structuresToCreate.push({
          name: structure.name,
          description: structure.description,
          maxScore: structure.maxScore,
          isExam: structure.isExam,
          order: structure.order,
        });
      }

      // Also copy the assessment structure template
      const previousTemplate = await this.prisma.assessmentStructureTemplate.findFirst({
        where: {
          schoolId,
          academicSessionId: mostRecentSessionWithStructures.id,
          isActive: true,
          deletedAt: null,
        },
      });

      if (previousTemplate) {
        return await this.prisma.assessmentStructureTemplate.create({
          data: {
            schoolId,
            academicSessionId,
            name: previousTemplate.name,
            description: previousTemplate.description,
            assessments: previousTemplate.assessments,
            isActive: true,
          },
        });
      } else {
        // Create template from copied structures
        return await this.prisma.assessmentStructureTemplate.create({
          data: {
            schoolId,
            academicSessionId,
            name: 'Standard Assessment Structure',
            description: 'Standard assessment structure for all subjects',
            assessments: structuresToCreate as any,
            isActive: true,
          },
        });
      }
    }

    // Try to use global default template
    const globalDefault = await this.prisma.assessmentStructureTemplate.findFirst({
      where: {
        isGlobalDefault: true,
        isActive: true,
        deletedAt: null,
      },
    });

    if (globalDefault) {
      return await this.createFromGlobalDefault(schoolId, academicSessionId, globalDefault);
    }

    // Fallback to hardcoded defaults
    const defaultStructures = [
      {
        name: 'CA 1',
        description: 'First continuous assessment test',
        maxScore: 20,
        isExam: false,
        order: 1,
      },
      {
        name: 'CA 2',
        description: 'Second continuous assessment test',
        maxScore: 20,
        isExam: false,
        order: 2,
      },
      {
        name: 'Exam',
        description: 'Final examination',
        maxScore: 60,
        isExam: true,
        order: 3,
      },
    ];

    // Create assessment structures
    for (const structure of defaultStructures) {
      await this.prisma.assessmentStructure.create({
        data: {
          schoolId,
          academicSessionId,
          name: structure.name,
          description: structure.description,
          maxScore: structure.maxScore,
          isExam: structure.isExam,
          order: structure.order,
          isActive: true,
        },
      });
    }

    // Create assessment structure template
    return await this.prisma.assessmentStructureTemplate.create({
      data: {
        schoolId,
        academicSessionId,
        name: 'Standard Assessment Structure',
        description: 'Standard assessment structure for all subjects',
        assessments: defaultStructures as any,
        isActive: true,
      },
    });
  }
}
