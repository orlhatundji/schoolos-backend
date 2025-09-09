import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { Teacher } from './types';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeacherByUserId(userId: string): Promise<Teacher | null> {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        user: {
          include: {
            school: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return teacher;
  }

  async getTeacherByTeacherNo(teacherNo: string): Promise<Teacher | null> {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        teacherNo,
        deletedAt: null,
      },
      include: {
        user: {
          include: {
            school: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return teacher;
  }
}
