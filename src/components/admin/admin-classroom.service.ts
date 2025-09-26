import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { UpdateClassroomDto } from '../bff/admin/dto/update-classroom.dto';

@Injectable()
export class AdminClassroomService {
  constructor(private readonly prisma: PrismaService) {}

  async getClassroom(userId: string, classroomId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Get classroom details with related data
    const classroom = await this.prisma.classArm.findFirst({
      where: {
        id: classroomId,
        schoolId: user.schoolId,
        deletedAt: null,
      },
      include: {
        level: true,
        classTeacher: {
          include: {
            user: true,
          },
        },
        students: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found or access denied');
    }

    return {
      id: classroom.id,
      name: classroom.name,
      levelId: classroom.levelId,
      level: classroom.level.name,
      classTeacherId: classroom.classTeacherId,
      classTeacher: classroom.classTeacher
        ? {
            id: classroom.classTeacher.id,
            name: `${classroom.classTeacher.user.firstName} ${classroom.classTeacher.user.lastName}`,
            email: classroom.classTeacher.user.email,
          }
        : null,
      studentsCount: classroom.students.length,
      location: (classroom as any).location,
      createdAt: classroom.createdAt,
      updatedAt: classroom.updatedAt,
    };
  }

  async deleteClassroom(userId: string, classroomId: string): Promise<{ message: string }> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Check if classroom (class arm) exists and belongs to the school
    const classroom = await this.prisma.classArm.findFirst({
      where: {
        id: classroomId,
        schoolId: user.schoolId,
        deletedAt: null,
      },
      include: {
        students: {
          where: { deletedAt: null },
        },
        classArmSubjectTeachers: {
          where: { deletedAt: null },
        },
        classArmTeachers: {
          where: { deletedAt: null },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found or access denied');
    }

    // Check if classroom has any enrolled students
    if (classroom.students.length > 0) {
      throw new BadRequestException(
        `Cannot delete classroom. It has ${classroom.students.length} enrolled student${classroom.students.length !== 1 ? 's' : ''}. Please remove all students from the classroom first.`,
      );
    }

    // Check if classroom has any teacher assignments
    const hasSubjectTeachers = classroom.classArmSubjectTeachers.length > 0;
    const hasClassTeachers = classroom.classArmTeachers.length > 0;

    if (hasSubjectTeachers || hasClassTeachers) {
      const reasons = [];
      if (hasSubjectTeachers) reasons.push('subject teacher assignments');
      if (hasClassTeachers) reasons.push('class teacher assignments');

      throw new BadRequestException(
        `Cannot delete classroom. It has active ${reasons.join(' and ')}. Please remove all teacher assignments first.`,
      );
    }

    // Soft delete the classroom
    await this.prisma.classArm.update({
      where: { id: classroomId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Classroom deleted successfully' };
  }

  async updateClassroom(
    userId: string,
    classroomId: string,
    updateClassroomDto: UpdateClassroomDto,
  ) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if classroom exists and belongs to the school
    const existingClassroom = await this.prisma.classArm.findFirst({
      where: {
        id: classroomId,
        schoolId,
        deletedAt: null,
      },
      include: {
        level: true,
      },
    });

    if (!existingClassroom) {
      throw new NotFoundException('Classroom not found or access denied');
    }

    // Validate level if provided
    if (updateClassroomDto.levelId) {
      const level = await this.prisma.level.findFirst({
        where: {
          id: updateClassroomDto.levelId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!level) {
        throw new BadRequestException('Level not found or does not belong to this school');
      }
    }

    // Check for name conflicts if name is being updated
    if (updateClassroomDto.name) {
      const nameConflict = await this.prisma.classArm.findFirst({
        where: {
          schoolId,
          levelId: updateClassroomDto.levelId || existingClassroom.levelId,
          academicSessionId: existingClassroom.academicSessionId,
          name: {
            equals: updateClassroomDto.name,
            mode: 'insensitive',
          },
          id: {
            not: classroomId,
          },
          deletedAt: null,
        },
      });

      if (nameConflict) {
        const levelName = updateClassroomDto.levelId
          ? (await this.prisma.level.findUnique({ where: { id: updateClassroomDto.levelId } }))
              ?.name
          : existingClassroom.level.name;
        throw new ConflictException(
          `Classroom with name '${updateClassroomDto.name}' already exists in ${levelName}`,
        );
      }
    }

    // Validate class teacher if provided
    if (updateClassroomDto.classTeacherId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: {
          id: updateClassroomDto.classTeacherId,
          deletedAt: null,
          user: {
            schoolId,
          },
        },
      });

      if (!teacher) {
        throw new BadRequestException('Teacher not found or does not belong to this school');
      }
    }

    // Update the classroom
    const updateData: any = {
      ...(updateClassroomDto.name && { name: updateClassroomDto.name }),
      ...(updateClassroomDto.levelId && { levelId: updateClassroomDto.levelId }),
      ...(updateClassroomDto.location !== undefined && {
        location: updateClassroomDto.location,
      }),
    };

    // Handle teacher assignment separately if needed
    if (updateClassroomDto.classTeacherId !== undefined) {
      if (updateClassroomDto.classTeacherId) {
        updateData.classTeacherId = updateClassroomDto.classTeacherId;
      } else {
        updateData.classTeacherId = null;
      }
    }

    const updatedClassroom = await this.prisma.classArm.update({
      where: { id: classroomId },
      data: updateData,
      include: {
        level: true,
        classTeacher: {
          include: {
            user: true,
          },
        },
      },
    });

    return {
      id: updatedClassroom.id,
      name: updatedClassroom.name,
      level: updatedClassroom.level.name,
      classTeacher: updatedClassroom.classTeacher
        ? {
            id: updatedClassroom.classTeacher.id,
            name: `${updatedClassroom.classTeacher.user.firstName} ${updatedClassroom.classTeacher.user.lastName}`,
          }
        : null,
      updatedAt: updatedClassroom.updatedAt,
    };
  }
}
