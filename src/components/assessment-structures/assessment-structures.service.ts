import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AssessmentStructuresRepository } from './assessment-structures.repository';
import { CreateAssessmentStructureDto, UpdateAssessmentStructureDto } from './dto';
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

    // Check if assessment structure with this name already exists for the school
    const existingStructure = await this.assessmentStructuresRepository.findOne({
      where: {
        schoolId: user.schoolId,
        name: createAssessmentStructureDto.name,
        deletedAt: null,
      },
    });

    if (existingStructure) {
      throw new ConflictException(AssessmentStructureMessages.ERROR.ALREADY_EXISTS);
    }

    // Validate total score doesn't exceed 100
    await this.validateTotalScore(user.schoolId, createAssessmentStructureDto.maxScore);

    const assessmentStructure = await this.assessmentStructuresRepository.create({
      ...createAssessmentStructureDto,
      schoolId: user.schoolId,
    });

    return assessmentStructure;
  }

  async findAll(userId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const assessmentStructures = await this.assessmentStructuresRepository.findAll({
      where: {
        schoolId: user.schoolId,
        deletedAt: null,
      },
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

    // If name is being updated, check for conflicts
    if (
      updateAssessmentStructureDto.name &&
      updateAssessmentStructureDto.name !== existingStructure.name
    ) {
      const nameConflict = await this.assessmentStructuresRepository.findOne({
        where: {
          schoolId: user.schoolId,
          name: updateAssessmentStructureDto.name,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw new ConflictException(AssessmentStructureMessages.ERROR.ALREADY_EXISTS);
      }
    }

    // If maxScore is being updated, validate total score
    if (updateAssessmentStructureDto.maxScore) {
      await this.validateTotalScore(user.schoolId, updateAssessmentStructureDto.maxScore, id);
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

  private async validateTotalScore(schoolId: string, newMaxScore: number, excludeId?: string) {
    const existingStructures = await this.assessmentStructuresRepository.findAll({
      where: {
        schoolId,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    const totalScore =
      existingStructures.reduce((sum, structure) => sum + structure.maxScore, 0) + newMaxScore;

    if (totalScore > 100) {
      throw new BadRequestException(AssessmentStructureMessages.ERROR.INVALID_TOTAL_SCORE);
    }
  }
}
