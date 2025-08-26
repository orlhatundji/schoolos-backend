import { HttpStatus } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { AdminClassroomDetailsResult } from './results/admin-classroom-details.result';
import { AdminClassroomsViewResult } from './results/admin-classrooms-view.result';
import { AdminStudentsViewResult } from './results/admin-students-view.result';
import { AdminAdminsViewResult } from './results/admin-admins-view.result';
import { AdminDepartmentsViewResult } from './results/admin-departments-view.result';
import { AdminSubjectsViewResult } from './results/admin-subjects-view.result';
import { AdminTeachersViewResult } from './results/admin-teachers-view.result';
import { ArchiveDepartmentResult } from './results/archive-department.result';
import { CreateDepartmentResult } from './results/create-department.result';
import { CreateSubjectResult } from './results/create-subject.result';
import { DeleteSubjectResult } from './results/delete-subject.result';
import { UnarchiveDepartmentResult } from './results/unarchive-department.result';
import { UpdateDepartmentResult } from './results/update-department.result';
import { UpdateSubjectResult } from './results/update-subject.result';
import { SingleStudentDetailsResult } from './results/single-student-details.result';
import { SingleTeacherDetailsResult } from './results/single-teacher-details.result';
import { StudentDetailsResult } from './results/student-details.result';
import { DeleteDepartmentResult } from './results/delete-department.result';
import { AdminLevelsViewResult } from './results/admin-levels-view.result';
import { CreateLevelResult } from './results/create-level.result';
import { UpdateLevelResult } from './results/update-level.result';
import { ArchiveLevelResult } from './results/archive-level.result';
import { UnarchiveLevelResult } from './results/unarchive-level.result';
import { DeleteLevelResult } from './results/delete-level.result';

// Classrooms View
export const ClassroomsViewSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: AdminClassroomsViewResult,
  });

// Teachers View
export const TeachersViewSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: AdminTeachersViewResult,
    description: 'Get teachers overview with statistics and detailed teacher information',
  });

// Single Teacher Details
export const SingleTeacherDetailsParam = () =>
  ApiParam({
    name: 'teacherId',
    description: 'The ID of the teacher to get details for',
    type: 'string',
  });

export const SingleTeacherDetailsResponse = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: SingleTeacherDetailsResult,
    description:
      'Detailed information about a specific teacher including personal info, department, subjects, classes, and performance metrics',
  });

// Classroom Details
export const ClassroomDetailsParam = () =>
  ApiParam({
    name: 'classroomId',
    description: 'The ID of the classroom to get details for',
    type: 'string',
  });

export const ClassroomDetailsPageQuery = () =>
  ApiQuery({
    name: 'page',
    description: 'Page number for student pagination',
    type: 'number',
    required: false,
    example: 1,
  });

export const ClassroomDetailsLimitQuery = () =>
  ApiQuery({
    name: 'limit',
    description: 'Number of students per page',
    type: 'number',
    required: false,
    example: 10,
  });

export const ClassroomDetailsResponse = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: AdminClassroomDetailsResult,
    description:
      'Detailed information about a specific classroom including population, attendance, teachers, students, and top performers',
  });

// Student Details
export const StudentDetailsPageQuery = () =>
  ApiQuery({
    name: 'page',
    description: 'Page number for student pagination',
    type: 'number',
    required: false,
    example: 1,
  });

export const StudentDetailsLimitQuery = () =>
  ApiQuery({
    name: 'limit',
    description: 'Number of students per page',
    type: 'number',
    required: false,
    example: 20,
  });

export const StudentDetailsClassroomQuery = () =>
  ApiQuery({
    name: 'classroomId',
    description: 'Filter students by classroom ID',
    type: 'string',
    required: false,
  });

export const StudentDetailsSearchQuery = () =>
  ApiQuery({
    name: 'search',
    description: 'Search students by name, admission number, or student ID',
    type: 'string',
    required: false,
  });

export const StudentDetailsResponse = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: StudentDetailsResult,
    description: 'Paginated list of student details with comprehensive information',
  });

// Single Student Details
export const SingleStudentDetailsParam = () =>
  ApiParam({
    name: 'studentId',
    description: 'The ID of the student to get details for',
    type: 'string',
  });

export const SingleStudentDetailsResponse = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: SingleStudentDetailsResult,
    description: 'Detailed information about a specific student',
  });

// Students View
export const StudentsViewSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: AdminStudentsViewResult,
    description: 'Get students overview with statistics and detailed student information',
  });

// Subjects View
export const SubjectsViewSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: AdminSubjectsViewResult,
    description: 'Get subjects overview with statistics and detailed subject information',
  });

// Create Subject
export const CreateSubjectSwagger = () =>
  ApiResponse({
    status: HttpStatus.CREATED,
    type: CreateSubjectResult,
    description: 'Subject created successfully',
  });

// Update Subject
export const UpdateSubjectSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: UpdateSubjectResult,
    description: 'Subject updated successfully',
  });

// Delete Subject
export const DeleteSubjectSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: DeleteSubjectResult,
    description: 'Subject deleted successfully',
  });

// Departments View
export const DepartmentsViewSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: AdminDepartmentsViewResult,
    description: 'Get departments overview with statistics and detailed department information',
  });

// Create Department
export const CreateDepartmentSwagger = () =>
  ApiResponse({
    status: HttpStatus.CREATED,
    type: CreateDepartmentResult,
    description: 'Department created successfully',
  });

// Update Department
export const UpdateDepartmentSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: UpdateDepartmentResult,
    description: 'Department updated successfully',
  });

// Archive Department
export const ArchiveDepartmentSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: ArchiveDepartmentResult,
    description: 'Department archived successfully',
  });

// Unarchive Department
export const UnarchiveDepartmentSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: UnarchiveDepartmentResult,
    description: 'Department unarchived successfully',
  });

// Delete Department
export const DeleteDepartmentSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: DeleteDepartmentResult,
    description: 'Department deleted successfully',
  });

// Levels View
export const LevelsViewSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: AdminLevelsViewResult,
    description: 'Get levels overview with statistics and detailed level information',
  });

// Create Level
export const CreateLevelSwagger = () =>
  ApiResponse({
    status: HttpStatus.CREATED,
    type: CreateLevelResult,
    description: 'Level created successfully',
  });

// Update Level
export const UpdateLevelSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: UpdateLevelResult,
    description: 'Level updated successfully',
  });

// Archive Level
export const ArchiveLevelSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: ArchiveLevelResult,
    description: 'Level archived successfully',
  });

// Unarchive Level
export const UnarchiveLevelSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: UnarchiveLevelResult,
    description: 'Level unarchived successfully',
  });

// Delete Level
export const DeleteLevelSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: DeleteLevelResult,
    description: 'Level deleted successfully',
  });

// Admins View
export const AdminsViewSwagger = () =>
  ApiResponse({
    status: HttpStatus.OK,
    type: AdminAdminsViewResult,
    description: 'Get admins overview with statistics and detailed admin information',
  });
