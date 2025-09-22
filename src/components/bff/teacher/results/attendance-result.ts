import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { BaseResultWithData } from '../../../../common/results';

export class AttendanceRecord {
  @ApiProperty({ description: 'Student ID' })
  studentId: string;

  @ApiProperty({ description: 'Student name' })
  studentName: string;

  @ApiProperty({ description: 'Student number' })
  studentNo: string;

  @ApiProperty({ description: 'Attendance status' })
  status: string;

  @ApiProperty({ description: 'Optional remarks', required: false })
  remarks?: string;

  @ApiProperty({ description: 'Date of attendance' })
  date: Date;
}

export class ClassAttendanceResult {
  @ApiProperty({ description: 'Class arm ID' })
  classArmId: string;

  @ApiProperty({ description: 'Class arm name' })
  classArmName: string;

  @ApiProperty({ description: 'Date of attendance' })
  date: Date;

  @ApiProperty({ description: 'Academic session ID' })
  academicSessionId: string;

  @ApiProperty({ description: 'Term ID' })
  termId: string;

  @ApiProperty({ description: 'Array of attendance records', type: [AttendanceRecord] })
  attendanceRecords: AttendanceRecord[];

  @ApiProperty({ description: 'Total students marked' })
  totalStudents: number;

  @ApiProperty({ description: 'Number of present students' })
  presentCount: number;

  @ApiProperty({ description: 'Number of absent students' })
  absentCount: number;

  @ApiProperty({ description: 'Number of late students' })
  lateCount: number;

  @ApiProperty({ description: 'Number of excused students' })
  excusedCount: number;
}

export class SubjectAttendanceResult {
  @ApiProperty({ description: 'Subject ID' })
  subjectId: string;

  @ApiProperty({ description: 'Subject name' })
  subjectName: string;

  @ApiProperty({ description: 'Class arm ID' })
  classArmId: string;

  @ApiProperty({ description: 'Class arm name' })
  classArmName: string;

  @ApiProperty({ description: 'Date of attendance' })
  date: Date;

  @ApiProperty({ description: 'Academic session ID' })
  academicSessionId: string;

  @ApiProperty({ description: 'Term ID' })
  termId: string;

  @ApiProperty({ description: 'Array of attendance records', type: [AttendanceRecord] })
  attendanceRecords: AttendanceRecord[];

  @ApiProperty({ description: 'Total students marked' })
  totalStudents: number;

  @ApiProperty({ description: 'Number of present students' })
  presentCount: number;

  @ApiProperty({ description: 'Number of absent students' })
  absentCount: number;

  @ApiProperty({ description: 'Number of late students' })
  lateCount: number;

  @ApiProperty({ description: 'Number of excused students' })
  excusedCount: number;
}

export class ClassAttendanceResultResponse extends BaseResultWithData<ClassAttendanceResult> {
  @ApiProperty({ type: () => ClassAttendanceResult })
  public data: ClassAttendanceResult;

  public static from(
    result: ClassAttendanceResult,
    options: { message: string; status: HttpStatus },
  ): ClassAttendanceResultResponse {
    return new ClassAttendanceResultResponse(options.status, options.message, result);
  }
}

export class SubjectAttendanceResultResponse extends BaseResultWithData<SubjectAttendanceResult> {
  @ApiProperty({ type: () => SubjectAttendanceResult })
  public data: SubjectAttendanceResult;

  public static from(
    result: SubjectAttendanceResult,
    options: { message: string; status: HttpStatus },
  ): SubjectAttendanceResultResponse {
    return new SubjectAttendanceResultResponse(options.status, options.message, result);
  }
}
