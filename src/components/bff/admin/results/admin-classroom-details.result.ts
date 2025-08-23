import { ApiProperty } from '@nestjs/swagger';

import { ClassroomDetailsData } from '../types';

class ClassroomPopulationResult {
  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 12 })
  male: number;

  @ApiProperty({ example: 13 })
  female: number;
}

class AttendanceStatsResult {
  @ApiProperty({ example: 180 })
  totalDays: number;

  @ApiProperty({ example: 165 })
  presentDays: number;

  @ApiProperty({ example: 15 })
  absentDays: number;

  @ApiProperty({ example: 91.67 })
  attendanceRate: number;

  @ApiProperty({ example: 28, description: 'Number of students present today' })
  studentsPresent: number;

  @ApiProperty({ example: 2, description: 'Number of students absent today' })
  studentsAbsent: number;

  @ApiProperty({ example: 30, description: 'Total students in the classroom' })
  totalStudents: number;
}

class TopPerformerResult {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 95.5 })
  score: number;

  @ApiProperty({ example: 'Mathematics' })
  subject: string;
}

class StudentInfoResult {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Jane Smith' })
  name: string;

  @ApiProperty({ example: 'FEMALE' })
  gender: string;

  @ApiProperty({ example: 12 })
  age: number;

  @ApiProperty({ example: 'STU-2024-001' })
  admissionNumber: string;

  @ApiProperty({ example: '+1234567890', nullable: true })
  guardianPhone: string | null;

  @ApiProperty({ example: 'John Smith' })
  guardianName: string;

  @ApiProperty({ example: 'Lagos' })
  stateOfOrigin: string;
}

class ClassroomInfoResult {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Grade 6A' })
  name: string;

  @ApiProperty({ example: 'Grade 6' })
  level: string;

  @ApiProperty({ example: 'Building A, Room 101', nullable: true })
  location: string | null;
}

class ClassTeacherResult {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Mr. Johnson' })
  name: string;

  @ApiProperty({ example: '+1234567890', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'johnson@school.edu' })
  email: string;
}

class ClassCaptainResult {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Alice Wilson' })
  name: string;

  @ApiProperty({ example: 'STU-2024-002' })
  admissionNumber: string;
}

class PaginationInfoResult {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrevious: boolean;
}

class PaginatedStudentsResult {
  @ApiProperty({ type: [StudentInfoResult] })
  students: StudentInfoResult[];

  @ApiProperty({ type: PaginationInfoResult })
  pagination: PaginationInfoResult;
}

export class AdminClassroomDetailsResult {
  @ApiProperty({ type: ClassroomInfoResult })
  classroom: ClassroomInfoResult;

  @ApiProperty({ type: ClassroomPopulationResult })
  population: ClassroomPopulationResult;

  @ApiProperty({ type: AttendanceStatsResult })
  attendance: AttendanceStatsResult;

  @ApiProperty({ type: ClassTeacherResult, nullable: true })
  classTeacher: ClassTeacherResult | null;

  @ApiProperty({ type: ClassCaptainResult, nullable: true })
  classCaptain: ClassCaptainResult | null;

  @ApiProperty({ type: PaginatedStudentsResult })
  students: PaginatedStudentsResult;

  @ApiProperty({ type: [TopPerformerResult] })
  topPerformers: TopPerformerResult[];

  constructor(data: ClassroomDetailsData) {
    this.classroom = data.classroom;
    this.population = data.population;
    this.attendance = data.attendance;
    this.classTeacher = data.classTeacher;
    this.classCaptain = data.classCaptain;
    this.students = data.students;
    this.topPerformers = data.topPerformers;
  }
}
