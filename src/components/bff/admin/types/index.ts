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
