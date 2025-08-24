import { ApiProperty } from '@nestjs/swagger';

import { PaginatedStudentDetails } from '../types';

class StudentDetailInfoResult {
  @ApiProperty({ example: 'st_12345' })
  id: string;

  @ApiProperty({ example: 'Amaya Kemmer' })
  name: string;

  @ApiProperty({ example: 'xvjwidj' })
  studentId: string;

  @ApiProperty({ example: 'ADM/2024/001' })
  admissionNumber: string;

  @ApiProperty({ example: 'Male' })
  gender: string;

  @ApiProperty({ example: 15 })
  age: number;

  @ApiProperty({ example: 'Delta' })
  stateOfOrigin: string;

  @ApiProperty({ example: 'Ramon Hintz' })
  guardianName: string;

  @ApiProperty({ example: '+1487399867', nullable: true })
  guardianPhone: string | null;

  @ApiProperty({ example: '+1487399867', nullable: true })
  telephone: string | null;

  @ApiProperty({ example: 'JSS 2B' })
  className: string;

  @ApiProperty({ example: 'JSS 2' })
  classLevel: string;

  @ApiProperty({ example: 85.5 })
  averageGrade: number;

  @ApiProperty({ example: true })
  isPresent: boolean;

  @ApiProperty({ example: 93.2 })
  attendanceRate: number;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;
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

export class StudentDetailsResult {
  @ApiProperty({ type: [StudentDetailInfoResult] })
  students: StudentDetailInfoResult[];

  @ApiProperty({ type: PaginationInfoResult })
  pagination: PaginationInfoResult;

  constructor(data: PaginatedStudentDetails) {
    this.students = data.students;
    this.pagination = data.pagination;
  }
}
