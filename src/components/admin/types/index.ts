import { TeacherStatus, SubjectCategory } from '@prisma/client';

export interface TeacherDropdownItem {
  id: string;
  teacherNo: string;
  name: string;
  department: string | null;
  departmentCode: string | null;
  status: TeacherStatus;
}

export interface DepartmentDropdownItem {
  id: string;
  name: string;
  code: string;
  hodName: string | null;
  status: 'active' | 'archived';
}

export interface AcademicSessionDropdownItem {
  id: string;
  academicYear: string;
  isCurrent: boolean;
  startDate: Date;
  endDate: Date;
}

export interface LevelDropdownItem {
  id: string;
  name: string;
}

export interface TermDropdownItem {
  id: string;
  name: string;
  academicSessionId: string;
  academicYear: string;
}

export interface SubjectDropdownItem {
  id: string;
  name: string;
  category: SubjectCategory;
  department: string | null;
  departmentCode: string | null;
  status: 'active' | 'inactive';
}

export interface DropdownData {
  teachers: TeacherDropdownItem[];
  departments: DepartmentDropdownItem[];
  academicSessions: AcademicSessionDropdownItem[];
  levels: LevelDropdownItem[];
  terms: TermDropdownItem[];
  subjects: SubjectDropdownItem[];
}
