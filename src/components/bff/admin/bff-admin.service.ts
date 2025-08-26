import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma';
import { BffAdminAdminService } from './services/bff-admin-admin.service';
import { BffAdminClassroomService } from './services/bff-admin-classroom.service';
import { BffAdminDepartmentService } from './services/bff-admin-department.service';
import { BffAdminStudentService } from './services/bff-admin-student.service';
import { BffAdminSubjectService } from './services/bff-admin-subject.service';
import { BffAdminTeacherService } from './services/bff-admin-teacher.service';
import { BffAdminLevelService } from './services/bff-admin-level.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import {
  AdminClassroomsViewData,
  AdminsViewData,
  ClassroomDetailsData,
  DepartmentsViewData,
  PaginatedStudentDetails,
  SingleStudentDetails,
  SingleTeacherDetails,
  TeachersViewData,
  StudentsViewData,
  SubjectsViewData,
  LevelsViewData,
} from './types';

@Injectable()
export class BffAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherService: BffAdminTeacherService,
    private readonly studentService: BffAdminStudentService,
    private readonly classroomService: BffAdminClassroomService,
    private readonly subjectService: BffAdminSubjectService,
    private readonly departmentService: BffAdminDepartmentService,
    private readonly levelService: BffAdminLevelService,
    private readonly adminService: BffAdminAdminService,
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

  async getStudentsViewData(userId: string): Promise<StudentsViewData> {
    return this.studentService.getStudentsViewData(userId);
  }

  async getSubjectsViewData(userId: string): Promise<SubjectsViewData> {
    return this.subjectService.getSubjectsViewData(userId);
  }

  async createSubject(userId: string, createSubjectDto: CreateSubjectDto) {
    return this.subjectService.createSubject(userId, createSubjectDto);
  }

  async updateSubject(userId: string, subjectId: string, updateSubjectDto: UpdateSubjectDto) {
    return this.subjectService.updateSubject(userId, subjectId, updateSubjectDto);
  }

  async deleteSubject(userId: string, subjectId: string) {
    return this.subjectService.deleteSubject(userId, subjectId);
  }

  // Department methods
  async getDepartmentsViewData(userId: string): Promise<DepartmentsViewData> {
    return this.departmentService.getDepartmentsViewData(userId);
  }

  async createDepartment(userId: string, createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.createDepartment(userId, createDepartmentDto);
  }

  async updateDepartment(
    userId: string,
    departmentId: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentService.updateDepartment(userId, departmentId, updateDepartmentDto);
  }

  async archiveDepartment(userId: string, departmentId: string) {
    return this.departmentService.archiveDepartment(userId, departmentId);
  }

  async unarchiveDepartment(userId: string, departmentId: string) {
    return this.departmentService.unarchiveDepartment(userId, departmentId);
  }

  async deleteDepartment(userId: string, departmentId: string) {
    return this.departmentService.deleteDepartment(userId, departmentId);
  }

  // Level methods
  async getLevelsViewData(userId: string): Promise<LevelsViewData> {
    return this.levelService.getLevelsViewData(userId);
  }

  async createLevel(userId: string, createLevelDto: CreateLevelDto) {
    return this.levelService.createLevel(userId, createLevelDto);
  }

  async updateLevel(userId: string, levelId: string, updateLevelDto: UpdateLevelDto) {
    return this.levelService.updateLevel(userId, levelId, updateLevelDto);
  }

  async archiveLevel(userId: string, levelId: string) {
    return this.levelService.archiveLevel(userId, levelId);
  }

  async unarchiveLevel(userId: string, levelId: string) {
    return this.levelService.unarchiveLevel(userId, levelId);
  }

  async deleteLevel(userId: string, levelId: string) {
    return this.levelService.deleteLevel(userId, levelId);
  }

  // Admin methods
  async getAdminsViewData(userId: string): Promise<AdminsViewData> {
    return this.adminService.getAdminsViewData(userId);
  }
}
