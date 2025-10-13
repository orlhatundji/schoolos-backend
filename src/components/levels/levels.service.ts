import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';

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

    // Get the next order value for this school
    const maxOrder = await this.prisma.level.findFirst({
      where: { schoolId: user.schoolId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrder?.order || 0) + 1;

    const level = await this.prisma.level.create({
      data: {
        ...createLevelDto,
        schoolId: user.schoolId,
        order: nextOrder,
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
}
