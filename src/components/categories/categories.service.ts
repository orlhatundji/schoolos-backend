import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma';
import { CreateCategoryDto } from './dto/create-category.dto';

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
}
