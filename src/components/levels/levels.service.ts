import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { ReorderLevelDto, ReorderDirection } from './dto/reorder-level.dto';

@Injectable()
export class LevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async createLevel(userId: string, createLevelDto: CreateLevelDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Check if code already exists for this school
    const existingCode = await this.prisma.level.findFirst({
      where: {
        schoolId: user.schoolId,
        code: createLevelDto.code,
        deletedAt: null,
      },
    });

    if (existingCode) {
      throw new BadRequestException(
        `A level with code "${createLevelDto.code}" already exists in your school.`
      );
    }

    // Check if order already exists for this school
    const existingLevel = await this.prisma.level.findFirst({
      where: {
        schoolId: user.schoolId,
        order: createLevelDto.order,
        deletedAt: null,
      },
    });

    if (existingLevel) {
      throw new BadRequestException(
        `Order ${createLevelDto.order} is already taken by level "${existingLevel.name}". Please choose a different order.`
      );
    }

    // Use the provided order value
    const level = await this.prisma.level.create({
      data: {
        ...createLevelDto,
        schoolId: user.schoolId,
      },
    });

    return level;
  }

  async updateLevel(userId: string, levelId: string, updateLevelDto: UpdateLevelDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Verify the level belongs to the user's school
    const existingLevel = await this.prisma.level.findFirst({
      where: {
        id: levelId,
        schoolId: user.schoolId,
      },
    });

    if (!existingLevel) {
      throw new Error('Level not found or access denied');
    }

    const level = await this.prisma.level.update({
      where: { id: levelId },
      data: updateLevelDto,
    });

    return level;
  }

  async archiveLevel(userId: string, levelId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Verify the level belongs to the user's school
    const existingLevel = await this.prisma.level.findFirst({
      where: {
        id: levelId,
        schoolId: user.schoolId,
      },
    });

    if (!existingLevel) {
      throw new Error('Level not found or access denied');
    }

    const level = await this.prisma.level.update({
      where: { id: levelId },
      data: { deletedAt: new Date() },
    });

    return level;
  }

  async unarchiveLevel(userId: string, levelId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Verify the level belongs to the user's school
    const existingLevel = await this.prisma.level.findFirst({
      where: {
        id: levelId,
        schoolId: user.schoolId,
      },
    });

    if (!existingLevel) {
      throw new Error('Level not found or access denied');
    }

    const level = await this.prisma.level.update({
      where: { id: levelId },
      data: { deletedAt: null },
    });

    return level;
  }

  async deleteLevel(userId: string, levelId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Verify the level belongs to the user's school
    const existingLevel = await this.prisma.level.findFirst({
      where: {
        id: levelId,
        schoolId: user.schoolId,
      },
    });

    if (!existingLevel) {
      throw new Error('Level not found or access denied');
    }

    // Check if level has associated class arms
    const classArms = await this.prisma.classArm.findFirst({
      where: { levelId },
    });

    if (classArms) {
      throw new BadRequestException(
        'Cannot delete level. It has associated class arms. Please reassign or remove all associated class arms first.',
      );
    }

    await this.prisma.level.delete({
      where: { id: levelId },
    });

    return { message: 'Level deleted successfully' };
  }

  async reorderLevel(userId: string, levelId: string, reorderLevelDto: ReorderLevelDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Get the current level
    const currentLevel = await this.prisma.level.findFirst({
      where: {
        id: levelId,
        schoolId: user.schoolId,
        deletedAt: null, // Only allow reordering of active levels
      },
    });

    if (!currentLevel) {
      throw new NotFoundException('Level not found or access denied');
    }

    // Get all levels for the school, sorted by order, then by creation date for consistent ordering
    const allLevels = await this.prisma.level.findMany({
      where: {
        schoolId: user.schoolId,
        deletedAt: null,
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ],
    });

    const currentIndex = allLevels.findIndex(level => level.id === levelId);
    
    if (currentIndex === -1) {
      throw new NotFoundException('Level not found');
    }

    // Determine target index based on direction
    let targetIndex: number;
    if (reorderLevelDto.direction === ReorderDirection.UP) {
      targetIndex = currentIndex - 1;
    } else {
      targetIndex = currentIndex + 1;
    }

    // Check if move is valid (not at boundaries)
    if (targetIndex < 0 || targetIndex >= allLevels.length) {
      throw new BadRequestException(
        `Cannot move level ${reorderLevelDto.direction}. Already at ${reorderLevelDto.direction === ReorderDirection.UP ? 'top' : 'bottom'} of the list.`
      );
    }

    const targetLevel = allLevels[targetIndex];

    // Check if there are duplicate orders and fix them first
    const orderCounts = new Map<number, number>();
    allLevels.forEach(level => {
      orderCounts.set(level.order, (orderCounts.get(level.order) || 0) + 1);
    });

    // If there are duplicate orders, reassign them with unique values
    if (Array.from(orderCounts.values()).some(count => count > 1)) {
      // Reassign all levels with unique orders
      const updates = allLevels.map((level, index) => 
        this.prisma.level.update({
          where: { id: level.id },
          data: { order: index + 1 },
        })
      );
      
      await this.prisma.$transaction(updates);
      
      // Now get the updated levels
      const updatedLevels = await this.prisma.level.findMany({
        where: {
          schoolId: user.schoolId,
          deletedAt: null,
        },
        orderBy: { order: 'asc' },
      });

      const newCurrentIndex = updatedLevels.findIndex(level => level.id === levelId);
      const newTargetIndex = reorderLevelDto.direction === ReorderDirection.UP 
        ? newCurrentIndex - 1 
        : newCurrentIndex + 1;

      if (newTargetIndex < 0 || newTargetIndex >= updatedLevels.length) {
        throw new BadRequestException(
          `Cannot move level ${reorderLevelDto.direction}. Already at ${reorderLevelDto.direction === ReorderDirection.UP ? 'top' : 'bottom'} of the list.`
        );
      }

      const newTargetLevel = updatedLevels[newTargetIndex];
      const newCurrentLevel = updatedLevels[newCurrentIndex];

      // Swap the order values
      await this.prisma.$transaction([
        this.prisma.level.update({
          where: { id: newCurrentLevel.id },
          data: { order: newTargetLevel.order },
        }),
        this.prisma.level.update({
          where: { id: newTargetLevel.id },
          data: { order: newCurrentLevel.order },
        }),
      ]);
    } else {
      // No duplicates, proceed with normal swap
      await this.prisma.$transaction([
        this.prisma.level.update({
          where: { id: currentLevel.id },
          data: { order: targetLevel.order },
        }),
        this.prisma.level.update({
          where: { id: targetLevel.id },
          data: { order: currentLevel.order },
        }),
      ]);
    }

    // Return the updated level data
    const updatedLevel = await this.prisma.level.findUnique({
      where: { id: levelId },
      select: {
        id: true,
        name: true,
        code: true,
        order: true,
      },
    });

    return updatedLevel;
  }

  async fixDuplicateOrders(userId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Get all levels for the school, sorted by order, then by creation date
    const allLevels = await this.prisma.level.findMany({
      where: {
        schoolId: user.schoolId,
        deletedAt: null,
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ],
    });

    // Reassign all levels with unique orders
    const updates = allLevels.map((level, index) => 
      this.prisma.level.update({
        where: { id: level.id },
        data: { order: index + 1 },
      })
    );
    
    await this.prisma.$transaction(updates);

    return { message: 'Duplicate orders fixed successfully' };
  }
}
