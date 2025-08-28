import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSubject(userId: string, createSubjectDto: CreateSubjectDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    const subject = await this.prisma.subject.create({
      data: {
        name: createSubjectDto.name,
        category: createSubjectDto.category as any,
        department: createSubjectDto.departmentId ? {
          connect: { id: createSubjectDto.departmentId },
        } : undefined,
        school: {
          connect: { id: user.schoolId },
        },
      },
      include: {
        department: true,
      },
    });

    return subject;
  }

  async updateSubject(userId: string, subjectId: string, updateSubjectDto: UpdateSubjectDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the subject belongs to the user's school
    const existingSubject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId: user.schoolId,
      },
    });

    if (!existingSubject) {
      throw new NotFoundException('Subject not found or access denied');
    }

    const subject = await this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(updateSubjectDto.name && { name: updateSubjectDto.name }),
        ...(updateSubjectDto.category && { category: updateSubjectDto.category as any }),
        ...(updateSubjectDto.departmentId && { 
          department: {
            connect: { id: updateSubjectDto.departmentId },
          },
        }),
      },
      include: {
        department: true,
      },
    });

    return subject;
  }

  async deleteSubject(userId: string, subjectId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the subject belongs to the user's school
    const existingSubject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId: user.schoolId,
      },
    });

    if (!existingSubject) {
      throw new NotFoundException('Subject not found or access denied');
    }

    // Check if subject is being used in any curriculum or assessments
    const subjectUsage = await this.prisma.subjectTerm.findFirst({
      where: { subjectId },
      include: {
        subjectTermStudents: true,
      },
    });

    if (subjectUsage) {
      if (subjectUsage.subjectTermStudents.length > 0) {
        throw new BadRequestException('Cannot delete subject. It has associated student enrollments. Please remove all student enrollments first.');
      }
      throw new BadRequestException('Cannot delete subject. It is being used in curriculum or assessments.');
    }

    await this.prisma.subject.delete({
      where: { id: subjectId },
    });

    return { message: 'Subject deleted successfully' };
  }
}
