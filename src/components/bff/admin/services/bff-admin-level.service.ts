import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../../prisma';
import { CreateLevelDto } from '../dto/create-level.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';
import { LevelsViewData } from '../types';

@Injectable()
export class BffAdminLevelService {
  constructor(private readonly prisma: PrismaService) {}

  async getLevelsViewData(userId: string): Promise<LevelsViewData> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get all levels for the school with their related data
    const levels = await this.prisma.level.findMany({
      where: { schoolId },
      include: {
        classArms: {
          where: { deletedAt: null },
          include: {
            classArmStudents: {
              where: { isActive: true }
            },
          },
        },
      },
    });

    // Calculate statistics
    const totalLevels = levels.length;
    const activeLevels = levels.filter((level) => !level.deletedAt).length;
    const archivedLevels = totalLevels - activeLevels;
    const levelsWithClassArms = levels.filter((level) => level.classArms.length > 0).length;
    const levelsWithoutClassArms = totalLevels - levelsWithClassArms;

    // Process level data for the list
    const levelsData = levels.map((level) => {
      const classArmsCount = level.classArms.length;
      const studentsCount = level.classArms.reduce(
        (total, classArm) => total + classArm.classArmStudents.length,
        0,
      );
      const status: 'active' | 'archived' = level.deletedAt ? 'archived' : 'active';

      return {
        id: level.id,
        name: level.name,
        code: level.code,
        classArmsCount,
        studentsCount,
        status,
        createdAt: level.createdAt,
        updatedAt: level.updatedAt,
      };
    });

    return {
      stats: {
        totalLevels,
        activeLevels,
        archivedLevels,
        levelsWithClassArms,
        levelsWithoutClassArms,
      },
      levels: levelsData,
    };
  }

  async createLevel(userId: string, createLevelDto: CreateLevelDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if level with same name already exists in the school
    const existingLevel = await this.prisma.level.findFirst({
      where: {
        schoolId,
        name: {
          equals: createLevelDto.name,
          mode: 'insensitive', // Case-insensitive comparison
        },
        deletedAt: null,
      },
    });

    if (existingLevel) {
      throw new ConflictException(`Level with name '${createLevelDto.name}' already exists`);
    }

    // Check if level with same code already exists
    const existingCode = await this.prisma.level.findFirst({
      where: {
        code: {
          equals: createLevelDto.code,
          mode: 'insensitive', // Case-insensitive comparison
        },
        deletedAt: null,
      },
    });

    if (existingCode) {
      throw new ConflictException(`Level with code '${createLevelDto.code}' already exists`);
    }

    // Create the level
    const level = await this.prisma.level.create({
      data: {
        name: createLevelDto.name,
        code: createLevelDto.code.toUpperCase(),
        schoolId,
      },
    });

    return {
      id: level.id,
      name: level.name,
      code: level.code,
      schoolId: level.schoolId,
      createdAt: level.createdAt,
      updatedAt: level.updatedAt,
    };
  }

  async updateLevel(userId: string, levelId: string, updateLevelDto: UpdateLevelDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if level exists and belongs to the school
    const existingLevel = await this.prisma.level.findFirst({
      where: {
        id: levelId,
        schoolId,
      },
    });

    if (!existingLevel) {
      throw new NotFoundException('Level not found');
    }

    // Check for name conflict if name is being updated
    if (updateLevelDto.name && updateLevelDto.name !== existingLevel.name) {
      const nameConflict = await this.prisma.level.findFirst({
        where: {
          schoolId,
          name: {
            equals: updateLevelDto.name,
            mode: 'insensitive',
          },
          id: { not: levelId },
          deletedAt: null,
        },
      });

      if (nameConflict) {
        throw new ConflictException(`Level with name '${updateLevelDto.name}' already exists`);
      }
    }

    // Check for code conflict if code is being updated
    if (updateLevelDto.code && updateLevelDto.code !== existingLevel.code) {
      const codeConflict = await this.prisma.level.findFirst({
        where: {
          code: {
            equals: updateLevelDto.code,
            mode: 'insensitive',
          },
          id: { not: levelId },
          deletedAt: null,
        },
      });

      if (codeConflict) {
        throw new ConflictException(`Level with code '${updateLevelDto.code}' already exists`);
      }
    }

    // Update the level
    const updatedLevel = await this.prisma.level.update({
      where: { id: levelId },
      data: {
        ...(updateLevelDto.name && { name: updateLevelDto.name }),
        ...(updateLevelDto.code && { code: updateLevelDto.code.toUpperCase() }),
      },
    });

    return {
      id: updatedLevel.id,
      name: updatedLevel.name,
      code: updatedLevel.code,
      schoolId: updatedLevel.schoolId,
      createdAt: updatedLevel.createdAt,
      updatedAt: updatedLevel.updatedAt,
    };
  }

  async archiveLevel(userId: string, levelId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if level exists and belongs to the school
    const level = await this.prisma.level.findFirst({
      where: {
        id: levelId,
        schoolId,
        deletedAt: null, // Only active levels can be archived
      },
      include: {
        classArms: {
          where: { deletedAt: null },
        },
      },
    });

    if (!level) {
      throw new NotFoundException('Level not found or already archived');
    }

    // Check if level has associated class arms
    const hasClassArms = level.classArms.length > 0;

    if (hasClassArms) {
      throw new BadRequestException(
        `Cannot archive level. It has associated class arms. Please reassign or remove all associated class arms first.`,
      );
    }

    // Archive the level (soft delete)
    await this.prisma.level.update({
      where: { id: levelId },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Level archived successfully',
      id: levelId,
    };
  }

  async unarchiveLevel(userId: string, levelId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if level exists and belongs to the school
    const level = await this.prisma.level.findFirst({
      where: {
        id: levelId,
        schoolId,
        deletedAt: { not: null }, // Only archived levels can be unarchived
      },
    });

    if (!level) {
      throw new NotFoundException('Level not found or not archived');
    }

    // Unarchive the level
    await this.prisma.level.update({
      where: { id: levelId },
      data: {
        deletedAt: null,
      },
    });

    return {
      success: true,
      message: 'Level unarchived successfully',
      id: levelId,
    };
  }

  async deleteLevel(userId: string, levelId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if level exists and belongs to the school
    const level = await this.prisma.level.findFirst({
      where: {
        id: levelId,
        schoolId,
      },
      include: {
        classArms: {
          where: { deletedAt: null },
        },
      },
    });

    if (!level) {
      throw new NotFoundException('Level not found');
    }

    // Check if level has associated class arms
    const hasClassArms = level.classArms.length > 0;

    if (hasClassArms) {
      throw new BadRequestException(
        `Cannot delete level. It has associated class arms. Please reassign or remove all associated class arms first.`,
      );
    }

    // Permanently delete the level
    await this.prisma.level.delete({
      where: { id: levelId },
    });

    return {
      success: true,
      message: 'Level deleted successfully',
      id: levelId,
    };
  }
}
