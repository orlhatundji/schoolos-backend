import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SchoolsManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchools(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const { page = 1, limit = 10, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      // For now, we'll use a simple approach. In a real system, you might have a status field
      if (status === 'active') {
        where.deletedAt = null;
      }
    }

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          primaryAddress: true,
          _count: {
            select: {
              users: true,
              // students: true, // This relation doesn't exist in the current schema
              // teachers: true, // This relation doesn't exist in the current schema
            },
          },
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    return {
      schools,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getSchool(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        primaryAddress: true,
        addresses: {
          include: {
            address: true,
          },
        },
        users: {
          where: { deletedAt: null },
          include: {
            admin: true,
            teacher: true,
            student: true,
          },
        },
        academicSessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            users: true,
            // students: true, // This relation doesn't exist in the current schema
            // teachers: true, // This relation doesn't exist in the current schema
            academicSessions: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return school;
  }

  async updateSchoolStatus(id: string, status: string, reason?: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // For now, we'll use soft delete for deactivation
    if (status === 'inactive') {
      return this.prisma.school.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    if (status === 'active') {
      return this.prisma.school.update({
        where: { id },
        data: {
          deletedAt: null,
        },
      });
    }

    throw new Error(`Invalid status: ${status}`);
  }
}
