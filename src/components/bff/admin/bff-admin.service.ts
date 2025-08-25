import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma';
import { BffAdminClassroomService } from './services/bff-admin-classroom.service';
import { BffAdminStudentService } from './services/bff-admin-student.service';
import { BffAdminTeacherService } from './services/bff-admin-teacher.service';
import {
  AdminClassroomsViewData,
  ClassroomDetailsData,
  PaginatedStudentDetails,
  SingleStudentDetails,
  SingleTeacherDetails,
  TeachersViewData,
} from './types';

@Injectable()
export class BffAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherService: BffAdminTeacherService,
    private readonly studentService: BffAdminStudentService,
    private readonly classroomService: BffAdminClassroomService,
  ) {}

  async getClassroomsViewData(userId: string): Promise<AdminClassroomsViewData> {
    return this.classroomService.getClassroomsViewData(userId);
  }

  async getClassroomDetailsData(
    userId: string,
    classroomId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ClassroomDetailsData> {
    return this.classroomService.getClassroomDetailsData(userId, classroomId, page, limit);
  }

  async getStudentDetailsData(
    userId: string,
    page: number = 1,
    limit: number = 20,
    classroomId?: string,
    search?: string,
  ): Promise<PaginatedStudentDetails> {
    return this.studentService.getStudentDetailsData(userId, page, limit, classroomId, search);
  }

  async getSingleStudentDetails(userId: string, studentId: string): Promise<SingleStudentDetails> {
    return this.studentService.getSingleStudentDetails(userId, studentId);
  }

  async getTeachersViewData(userId: string): Promise<TeachersViewData> {
    return this.teacherService.getTeachersViewData(userId);
  }

  async getSingleTeacherDetails(userId: string, teacherId: string): Promise<SingleTeacherDetails> {
    return this.teacherService.getSingleTeacherDetails(userId, teacherId);
  }
}
