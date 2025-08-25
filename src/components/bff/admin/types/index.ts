export interface ViewStats {
  totalClassrooms: number;
  totalStudents: number;
  gradeLevels: number;
  capacityUsage: number;
}

export interface ClassroomInfo {
  id: string;
  name: string;
  level: string;
  location: string | null;
  classTeacher: string | null;
  classCaptain: string | null;
  studentsCount: number;
}

export interface AdminClassroomsViewData {
  stats: ViewStats;
  classrooms: ClassroomInfo[];
}

export interface ClassroomPopulation {
  total: number;
  male: number;
  female: number;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number; // percentage
  studentsPresent: number; // number of students currently present today
  studentsAbsent: number; // number of students currently absent today
  totalStudents: number; // total students in the classroom
}

export interface TopPerformer {
  id: string;
  name: string;
  score: number;
  subject: string;
}

export interface StudentInfo {
  id: string;
  name: string;
  gender: string;
  age: number;
  admissionNumber: string;
  guardianPhone: string | null;
  guardianName: string;
  stateOfOrigin: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedStudents {
  students: StudentInfo[];
  pagination: PaginationInfo;
}

export interface ClassroomDetailsData {
  classroom: {
    id: string;
    name: string;
    level: string;
    location: string | null;
  };
  population: ClassroomPopulation;
  attendance: AttendanceStats;
  classTeacher: {
    id: string;
    name: string;
    phone: string | null;
    email: string;
  } | null;
  classCaptain: {
    id: string;
    name: string;
    admissionNumber: string;
  } | null;
  students: PaginatedStudents;
  topPerformers: TopPerformer[];
}

export interface StudentDetailInfo {
  id: string;
  name: string;
  studentId: string;
  admissionNumber: string;
  gender: string;
  age: number;
  stateOfOrigin: string;
  guardianName: string;
  guardianPhone: string | null;
  telephone: string | null;
  className: string;
  classLevel: string;
  averageGrade: number;
  isPresent: boolean;
  attendanceRate: number;
  avatarUrl: string | null;
}

export interface PaginatedStudentDetails {
  students: StudentDetailInfo[];
  pagination: PaginationInfo;
}

// Type alias for single student details (same structure as StudentDetailInfo)
export type SingleStudentDetails = StudentDetailInfo;

// Teacher-related types
export interface TeacherStats {
  totalTeachers: number;
  activeTeachers: number;
  inactiveTeachers: number;
  onLeaveTeachers: number;
}

export interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  subjects: string[];
  employment: 'full-time' | 'part-time' | 'contract';
  experience: number;
  qualification: string;
  joinDate: string; // YYYY-MM-DD
  lastLogin: string | null; // ISO 8601
  status: 'active' | 'inactive' | 'on-leave';
  classesAssigned: string[];
  avatar: string | null; // URL
}

export interface TeachersViewData {
  stats: TeacherStats;
  teachers: TeacherInfo[];
}

export interface SingleTeacherDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  subjects: string[];
  employment: 'full-time' | 'part-time' | 'contract';
  experience: number;
  qualification: string;
  joinDate: string; // YYYY-MM-DD
  lastLogin: string | null; // ISO 8601
  status: 'active' | 'inactive' | 'on-leave';
  classesAssigned: string[];
  avatar: string | null; // URL
  // Additional detailed fields
  dateOfBirth: string | null; // YYYY-MM-DD
  gender: string;
  stateOfOrigin: string | null;
  address: {
    street1: string | null;
    street2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
  isHOD: boolean;
  hodDepartment: string | null;
  totalStudents: number;
  averageClassSize: number;
}
