import { ApiProperty } from '@nestjs/swagger';
import { TeacherStatus, SubjectCategory } from '@prisma/client';
import { DropdownData } from '../types';

export class TeacherDropdownItemResult {
  @ApiProperty({ description: 'Teacher ID' })
  id: string;

  @ApiProperty({ description: 'Teacher number' })
  teacherNo: string;

  @ApiProperty({ description: 'Teacher full name' })
  name: string;

  @ApiProperty({ description: 'Department name', nullable: true })
  department: string | null;

  @ApiProperty({ description: 'Department code', nullable: true })
  departmentCode: string | null;

  @ApiProperty({ description: 'Teacher status', enum: TeacherStatus })
  status: TeacherStatus;
}

export class DepartmentDropdownItemResult {
  @ApiProperty({ description: 'Department ID' })
  id: string;

  @ApiProperty({ description: 'Department name' })
  name: string;

  @ApiProperty({ description: 'Department code' })
  code: string;

  @ApiProperty({ description: 'Head of Department name', nullable: true })
  hodName: string | null;

  @ApiProperty({ description: 'Department status', enum: ['active', 'archived'] })
  status: 'active' | 'archived';
}

export class AcademicSessionDropdownItemResult {
  @ApiProperty({ description: 'Academic session ID' })
  id: string;

  @ApiProperty({ description: 'Academic year' })
  academicYear: string;

  @ApiProperty({ description: 'Whether this is the current session' })
  isCurrent: boolean;

  @ApiProperty({ description: 'Session start date' })
  startDate: Date;

  @ApiProperty({ description: 'Session end date' })
  endDate: Date;
}

export class LevelDropdownItemResult {
  @ApiProperty({ description: 'Level ID' })
  id: string;

  @ApiProperty({ description: 'Level name' })
  name: string;
}

export class TermDropdownItemResult {
  @ApiProperty({ description: 'Term ID' })
  id: string;

  @ApiProperty({ description: 'Term name' })
  name: string;

  @ApiProperty({ description: 'Academic session ID' })
  academicSessionId: string;

  @ApiProperty({ description: 'Academic year' })
  academicYear: string;
}

export class SubjectDropdownItemResult {
  @ApiProperty({ description: 'Subject ID' })
  id: string;

  @ApiProperty({ description: 'Subject name' })
  name: string;

  @ApiProperty({ description: 'Subject category', enum: SubjectCategory })
  category: SubjectCategory;

  @ApiProperty({ description: 'Department name', nullable: true })
  department: string | null;

  @ApiProperty({ description: 'Department code', nullable: true })
  departmentCode: string | null;

  @ApiProperty({ description: 'Subject status', enum: ['active', 'inactive'] })
  status: 'active' | 'inactive';
}

export class DropdownDataResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ type: [TeacherDropdownItemResult], description: 'List of teachers' })
  teachers: TeacherDropdownItemResult[];

  @ApiProperty({ type: [DepartmentDropdownItemResult], description: 'List of departments' })
  departments: DepartmentDropdownItemResult[];

  @ApiProperty({ type: [AcademicSessionDropdownItemResult], description: 'List of academic sessions' })
  academicSessions: AcademicSessionDropdownItemResult[];

  @ApiProperty({ type: [LevelDropdownItemResult], description: 'List of levels' })
  levels: LevelDropdownItemResult[];

  @ApiProperty({ type: [TermDropdownItemResult], description: 'List of terms' })
  terms: TermDropdownItemResult[];

  @ApiProperty({ type: [SubjectDropdownItemResult], description: 'List of subjects' })
  subjects: SubjectDropdownItemResult[];

  constructor(data: DropdownData) {
    this.success = true;
    this.teachers = data.teachers;
    this.departments = data.departments;
    this.academicSessions = data.academicSessions;
    this.levels = data.levels;
    this.terms = data.terms;
    this.subjects = data.subjects;
  }
}
