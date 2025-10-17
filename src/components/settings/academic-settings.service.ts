import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AcademicSettingsDto } from './dto/academic-settings.dto';

@Injectable()
export class AcademicSettingsService {
  constructor(private prisma: PrismaService) {}

  async getAcademicSettings(userId: string) {
    // Get the school ID from the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true }
    });

    if (!user?.schoolId) {
      throw new NotFoundException('School not found for user');
    }

    // Try to get existing settings
    const settings = await this.prisma.academicPromotionSettings.findUnique({
      where: { schoolId: user.schoolId }
    });

    if (settings) {
      return {
        data: {
          coreSubjects: settings.coreSubjects,
          totalSubjectsPassed: settings.totalSubjectsPassed,
          totalAverage: settings.totalAverage,
          useAttendance: settings.useAttendance,
          minimumAttendanceRate: settings.minimumAttendanceRate
        }
      };
    }

    // Return default settings if none exist
    return {
      data: {
        coreSubjects: ['Mathematics', 'English'],
        totalSubjectsPassed: 4,
        totalAverage: 50,
        useAttendance: true,
        minimumAttendanceRate: 50
      }
    };
  }

  async saveAcademicSettings(userId: string, dto: AcademicSettingsDto) {
    // Get the school ID from the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true }
    });

    if (!user?.schoolId) {
      throw new NotFoundException('School not found for user');
    }

    // Upsert the settings
    const settings = await this.prisma.academicPromotionSettings.upsert({
      where: { schoolId: user.schoolId },
      update: {
        coreSubjects: dto.coreSubjects,
        totalSubjectsPassed: dto.totalSubjectsPassed,
        totalAverage: dto.totalAverage,
        useAttendance: dto.useAttendance,
        minimumAttendanceRate: dto.minimumAttendanceRate,
        updatedAt: new Date()
      },
      create: {
        schoolId: user.schoolId,
        coreSubjects: dto.coreSubjects,
        totalSubjectsPassed: dto.totalSubjectsPassed,
        totalAverage: dto.totalAverage,
        useAttendance: dto.useAttendance,
        minimumAttendanceRate: dto.minimumAttendanceRate
      }
    });

    return {
      data: {
        coreSubjects: settings.coreSubjects,
        totalSubjectsPassed: settings.totalSubjectsPassed,
        totalAverage: settings.totalAverage,
        useAttendance: settings.useAttendance,
        minimumAttendanceRate: settings.minimumAttendanceRate
      }
    };
  }
}
