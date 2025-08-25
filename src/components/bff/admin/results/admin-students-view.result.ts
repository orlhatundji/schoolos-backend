import { ApiProperty } from '@nestjs/swagger';
import { StudentsViewData } from '../types';

export class StudentStatsResult {
  @ApiProperty({ description: 'Total number of students in the school' })
  totalStudents: number;

  @ApiProperty({ description: 'Number of male students' })
  maleStudents: number;

  @ApiProperty({ description: 'Number of female students' })
  femaleStudents: number;

  @ApiProperty({ description: 'Number of graduated students' })
  graduatedStudents: number;

  @ApiProperty({
    description: 'Attendance statistics for today',
    type: 'object',
    properties: {
      present: { type: 'number', description: 'Number of students present today' },
      absent: { type: 'number', description: 'Number of students absent today' },
      presentPercentage: { type: 'number', description: 'Percentage of students present today' },
      absentPercentage: { type: 'number', description: 'Percentage of students absent today' },
    },
  })
  attendanceToday: {
    present: number;
    absent: number;
    presentPercentage: number;
    absentPercentage: number;
  };

  @ApiProperty({
    description: 'Breakdown of students by status',
    type: 'object',
    properties: {
      active: { type: 'number', description: 'Number of active students' },
      inactive: { type: 'number', description: 'Number of inactive students' },
      suspended: { type: 'number', description: 'Number of suspended students' },
    },
  })
  statusBreakdown: {
    active: number;
    inactive: number;
    suspended: number;
  };
}

export class StudentDetailInfoResult {
  @ApiProperty({ description: 'Student ID' })
  id: string;

  @ApiProperty({ description: 'Student full name' })
  name: string;

  @ApiProperty({ description: 'Student number' })
  studentId: string;

  @ApiProperty({ description: 'Admission number' })
  admissionNumber: string;

  @ApiProperty({ description: 'Student gender' })
  gender: string;

  @ApiProperty({ description: 'Student age' })
  age: number;

  @ApiProperty({ description: 'State of origin' })
  stateOfOrigin: string;

  @ApiProperty({ description: 'Guardian name' })
  guardianName: string;

  @ApiProperty({ description: 'Guardian phone number', nullable: true })
  guardianPhone: string | null;

  @ApiProperty({ description: 'Student phone number', nullable: true })
  telephone: string | null;

  @ApiProperty({ description: 'Class name' })
  className: string;

  @ApiProperty({ description: 'Class level' })
  classLevel: string;

  @ApiProperty({ description: 'Average grade' })
  averageGrade: number;

  @ApiProperty({ description: 'Whether student is present today' })
  isPresent: boolean;

  @ApiProperty({ description: 'Attendance rate percentage' })
  attendanceRate: number;

  @ApiProperty({ description: 'Student avatar URL', nullable: true })
  avatarUrl: string | null;
}

export class AdminStudentsViewResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ type: StudentStatsResult, description: 'Student statistics' })
  stats: StudentStatsResult;

  @ApiProperty({ type: [StudentDetailInfoResult], description: 'List of students' })
  students: StudentDetailInfoResult[];

  constructor(data: StudentsViewData) {
    this.success = true;
    this.stats = data.stats;
    this.students = data.students;
  }
}
