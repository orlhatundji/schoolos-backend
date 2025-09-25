import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(userId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    const categories = await this.prisma.category.findMany({
      where: { 
        schoolId,
        deletedAt: null,
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    return categories;
  }

  async createCategory(userId: string, createCategoryDto: CreateCategoryDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if category with same name already exists in the school
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        schoolId,
        name: {
          equals: createCategoryDto.name,
          mode: 'insensitive', // Case-insensitive comparison
        },
        deletedAt: null,
      },
    });

    if (existingCategory) {
      throw new ConflictException(`Category with name '${createCategoryDto.name}' already exists`);
    }

    // Create the category
    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        schoolId,
      },
    });

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      isDefault: category.isDefault,
      schoolId: category.schoolId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async updateCategory(userId: string, categoryId: string, updateCategoryDto: UpdateCategoryDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if category exists and belongs to the school
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found or does not belong to this school');
    }

    // If updating name, check for conflicts
    if (updateCategoryDto.name && updateCategoryDto.name !== existingCategory.name) {
      const conflictingCategory = await this.prisma.category.findFirst({
        where: {
          schoolId,
          name: {
            equals: updateCategoryDto.name,
            mode: 'insensitive',
          },
          deletedAt: null,
          id: { not: categoryId },
        },
      });

      if (conflictingCategory) {
        throw new ConflictException(`Category with name '${updateCategoryDto.name}' already exists`);
      }
    }

    // Update the category
    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(updateCategoryDto.name && { name: updateCategoryDto.name }),
        ...(updateCategoryDto.description !== undefined && { description: updateCategoryDto.description }),
      },
    });

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      isDefault: category.isDefault,
      schoolId: category.schoolId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async deleteCategory(userId: string, categoryId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if category exists and belongs to the school
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found or does not belong to this school');
    }

    // Check if category is default (cannot be deleted)
    if (existingCategory.isDefault) {
      throw new BadRequestException('Default categories cannot be deleted');
    }

    // Check if category is being used by any subjects
    const subjectsUsingCategory = await this.prisma.subject.count({
      where: {
        categoryId,
        deletedAt: null,
      },
    });

    if (subjectsUsingCategory > 0) {
      throw new BadRequestException(`Cannot delete category. It is being used by ${subjectsUsingCategory} subject(s)`);
    }

    // Soft delete the category
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Category deleted successfully' };
  }
}
