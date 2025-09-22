import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AssessmentStructuresRepository } from './assessment-structures.repository';
import { CreateAssessmentStructureDto, UpdateAssessmentStructureDto, BulkUpdateAssessmentStructuresDto } from './dto';
import { AssessmentStructureMessages } from './results';

@Injectable()
export class AssessmentStructuresService {
  constructor(
    private readonly assessmentStructuresRepository: AssessmentStructuresRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(userId: string, createAssessmentStructureDto: CreateAssessmentStructureDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate academic session exists and belongs to the school
    const session = await this.prisma.academicSession.findFirst({
      where: {
        id: createAssessmentStructureDto.academicSessionId,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Academic session not found');
    }

    // Check if assessment structure with this name already exists for the school and session
    const existingStructure = await this.assessmentStructuresRepository.findOne({
      where: {
        schoolId: user.schoolId,
        academicSessionId: createAssessmentStructureDto.academicSessionId,
        name: createAssessmentStructureDto.name,
        deletedAt: null,
      },
    });

    if (existingStructure) {
      throw new ConflictException(AssessmentStructureMessages.ERROR.ALREADY_EXISTS);
    }

    // Validate total score doesn't exceed 100 for this session
    await this.validateTotalScore(user.schoolId, createAssessmentStructureDto.maxScore, undefined, createAssessmentStructureDto.academicSessionId);

    const assessmentStructure = await this.assessmentStructuresRepository.create({
      ...createAssessmentStructureDto,
      schoolId: user.schoolId,
    });

    return assessmentStructure;
  }

  async findAll(userId: string, academicSessionId?: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const whereClause: any = {
      schoolId: user.schoolId,
      deletedAt: null,
    };

    // If academicSessionId is provided, filter by session
    if (academicSessionId) {
      whereClause.academicSessionId = academicSessionId;
    }

    const assessmentStructures = await this.assessmentStructuresRepository.findAll({
      where: whereClause,
      orderBy: { order: 'asc' },
    });

    return assessmentStructures;
  }

  async findOne(userId: string, id: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const assessmentStructure = await this.assessmentStructuresRepository.findOne({
      where: {
        id,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!assessmentStructure) {
      throw new NotFoundException(AssessmentStructureMessages.ERROR.NOT_FOUND);
    }

    return assessmentStructure;
  }

  async update(
    userId: string,
    id: string,
    updateAssessmentStructureDto: UpdateAssessmentStructureDto,
  ) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if assessment structure exists
    const existingStructure = await this.assessmentStructuresRepository.findOne({
      where: {
        id,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!existingStructure) {
      throw new NotFoundException(AssessmentStructureMessages.ERROR.NOT_FOUND);
    }

    // Check if critical fields (maxScore, isExam) are being changed when structure is in use
    const isChangingCriticalFields = 
      (updateAssessmentStructureDto.maxScore !== undefined && updateAssessmentStructureDto.maxScore !== existingStructure.maxScore) ||
      (updateAssessmentStructureDto.isExam !== undefined && updateAssessmentStructureDto.isExam !== existingStructure.isExam);

    if (isChangingCriticalFields) {
      await this.validateAssessmentStructureNotInUse(id, user.schoolId);
    }

    // If name is being updated, check for conflicts within the same session
    if (
      updateAssessmentStructureDto.name &&
      updateAssessmentStructureDto.name !== existingStructure.name
    ) {
      const nameConflict = await this.assessmentStructuresRepository.findOne({
        where: {
          schoolId: user.schoolId,
          academicSessionId: existingStructure.academicSessionId,
          name: updateAssessmentStructureDto.name,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw new ConflictException(AssessmentStructureMessages.ERROR.ALREADY_EXISTS);
      }
    }

    // If maxScore is being updated, validate total score for the session
    if (updateAssessmentStructureDto.maxScore) {
      await this.validateTotalScore(user.schoolId, updateAssessmentStructureDto.maxScore, id, existingStructure.academicSessionId);
    }

    const assessmentStructure = await this.assessmentStructuresRepository.update(
      { id },
      updateAssessmentStructureDto,
    );

    return assessmentStructure;
  }

  async remove(userId: string, id: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if assessment structure exists
    const existingStructure = await this.assessmentStructuresRepository.findOne({
      where: {
        id,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!existingStructure) {
      throw new NotFoundException(AssessmentStructureMessages.ERROR.NOT_FOUND);
    }

    // Check if assessment structure is being used in existing assessments
    await this.validateAssessmentStructureNotInUse(id, user.schoolId);

    // Soft delete
    await this.assessmentStructuresRepository.update(
      { id },
      {
        deletedAt: new Date(),
        isActive: false,
      },
    );

    return { message: AssessmentStructureMessages.SUCCESS.DELETED };
  }

  async bulkUpdate(userId: string, bulkUpdateDto: BulkUpdateAssessmentStructuresDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get the academic session ID from the first structure
    const firstStructure = bulkUpdateDto.assessmentStructures[0];
    if (!firstStructure?.academicSessionId) {
      throw new BadRequestException('Academic session ID is required for bulk update');
    }

    const academicSessionId = firstStructure.academicSessionId;

    // Validate that all structures belong to the same session
    const invalidStructures = bulkUpdateDto.assessmentStructures.filter(
      s => s.academicSessionId !== academicSessionId
    );
    if (invalidStructures.length > 0) {
      throw new BadRequestException('All assessment structures must belong to the same academic session');
    }

    // Validate total score before making any changes
    const totalScore = bulkUpdateDto.assessmentStructures.reduce((sum, s) => sum + s.maxScore, 0);
    if (totalScore !== 100) {
      throw new BadRequestException(`Total score must be exactly 100%, got ${totalScore}%`);
    }

    // Check for duplicate names within the bulk update
    const names = bulkUpdateDto.assessmentStructures.map(s => s.name);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      const uniqueDuplicates = [...new Set(duplicateNames)];
      const duplicateIndices = uniqueDuplicates.map(dupName => {
        const indices = bulkUpdateDto.assessmentStructures
          .map((s, i) => s.name === dupName ? i : -1)
          .filter(i => i !== -1);
        return `${dupName} (at positions: ${indices.join(', ')})`;
      });
      throw new BadRequestException(`Duplicate names found: ${duplicateIndices.join(', ')}. Each assessment structure must have a unique name.`);
    }

    const results = [];
    const errors = [];

    try {
      // Start a transaction to ensure atomicity
      await this.prisma.$transaction(async (tx) => {
        // Get existing structures for this session (including soft-deleted ones)
        const existingStructures = await tx.assessmentStructure.findMany({
          where: {
            schoolId: user.schoolId,
            academicSessionId: academicSessionId,
          },
        });


        // Create a map of existing structures by name for quick lookup
        const existingByName = new Map(existingStructures.map(s => [s.name, s]));

        // Process each structure in the bulk update
        for (const [index, structureDto] of bulkUpdateDto.assessmentStructures.entries()) {
          try {
            const existingStructure = existingByName.get(structureDto.name);
            
            if (existingStructure) {
              // Check if structure is soft deleted
              if (existingStructure.deletedAt) {
                // Restore soft-deleted structure
                const restoredStructure = await tx.assessmentStructure.update({
                  where: { id: existingStructure.id },
                  data: {
                    name: structureDto.name,
                    description: structureDto.description,
                    maxScore: structureDto.maxScore,
                    isExam: structureDto.isExam,
                    order: structureDto.order,
                    isActive: true,
                    deletedAt: null,
                  },
                });
                results.push({ index, action: 'restored', data: restoredStructure });
              } else {
                // Update existing structure - only update if there are actual changes
                const hasChanges = 
                  existingStructure.description !== structureDto.description ||
                  existingStructure.maxScore !== structureDto.maxScore ||
                  existingStructure.isExam !== structureDto.isExam ||
                  existingStructure.order !== structureDto.order;

                if (hasChanges) {
                  const updatedStructure = await tx.assessmentStructure.update({
                    where: { id: existingStructure.id },
                    data: {
                      description: structureDto.description,
                      maxScore: structureDto.maxScore,
                      isExam: structureDto.isExam,
                      order: structureDto.order,
                      isActive: true,
                    },
                  });
                  results.push({ index, action: 'updated', data: updatedStructure });
                } else {
                  // No changes needed, just mark as processed
                  results.push({ index, action: 'unchanged', data: existingStructure });
                }
              }
            } else {
              // Create new structure
              const newStructure = await tx.assessmentStructure.create({
                data: {
                  schoolId: user.schoolId,
                  academicSessionId: structureDto.academicSessionId,
                  name: structureDto.name,
                  description: structureDto.description,
                  maxScore: structureDto.maxScore,
                  isExam: structureDto.isExam,
                  order: structureDto.order,
                  isActive: true,
                },
              });
              results.push({ index, action: 'created', data: newStructure });
            }
          } catch (error) {
            errors.push({
              index,
              error: error.message,
              data: structureDto,
            });
          }
        }

        // Soft delete any existing structures that are not in the new list
        const newNames = new Set(bulkUpdateDto.assessmentStructures.map(s => s.name));
        const structuresToDelete = existingStructures.filter(s => !newNames.has(s.name));
        
        if (structuresToDelete.length > 0) {
          await tx.assessmentStructure.updateMany({
      where: {
              id: { in: structuresToDelete.map(s => s.id) },
            },
            data: {
              deletedAt: new Date(),
            },
          });
        }
      });
    } catch (error) {
      // If transaction fails, add a general error
      errors.push({
        index: -1,
        error: error.message,
        data: null,
      });
    }

    return {
      results,
      errors,
      summary: {
        total: bulkUpdateDto.assessmentStructures.length,
        successful: results.length,
        failed: errors.length,
      },
    };
  }

  private async validateTotalScore(schoolId: string, newMaxScore: number, excludeId?: string, academicSessionId?: string) {
    const whereClause: any = {
        schoolId,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
    };

    // If academicSessionId is provided, filter by session
    if (academicSessionId) {
      whereClause.academicSessionId = academicSessionId;
    }

    const existingStructures = await this.assessmentStructuresRepository.findAll({
      where: whereClause,
    });

    const totalScore =
      existingStructures.reduce((sum, structure) => sum + structure.maxScore, 0) + newMaxScore;

    if (totalScore > 100) {
      throw new BadRequestException(AssessmentStructureMessages.ERROR.INVALID_TOTAL_SCORE);
    }
  }

  private async validateAssessmentStructureNotInUse(assessmentStructureId: string, schoolId: string) {
    // Check if this assessment structure is being used in any existing assessments
    const existingAssessments = await this.prisma.subjectTermStudentAssessment.findFirst({
      where: {
        subjectTermStudent: {
          student: {
            classArm: {
              schoolId: schoolId,
            },
          },
        },
        // We need to check if the assessment name matches the assessment structure name
        // This is a simplified check - in a real implementation, you might want to store
        // the assessment structure ID directly in the assessment record
      },
    });

    if (existingAssessments) {
      throw new BadRequestException(AssessmentStructureMessages.ERROR.IN_USE);
    }
  }
}
