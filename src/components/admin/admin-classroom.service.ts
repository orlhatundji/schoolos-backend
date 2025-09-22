import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';

@Injectable()
export class AdminClassroomService {
  constructor(private readonly prisma: PrismaService) {}

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
}
