import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class SubjectStudentAttendanceDto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  studentId: string;

  @ApiProperty({
    description: 'Attendance status',
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
  })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({
    description: 'Optional remarks for the attendance record',
    required: false,
    example: 'Participated actively in class',
  })
  @IsString()
  remarks?: string;
}

export class MarkSubjectAttendanceDto {
  @ApiProperty({
    description: 'Subject ID for which attendance is being marked',
    example: 'subject-uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  subjectId: string;

  @ApiProperty({
    description: 'Class arm ID for which attendance is being marked',
    example: 'class-arm-uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  classArmId: string;

  @ApiProperty({
    description: 'Date for which attendance is being marked (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Academic session ID',
    example: 'session-uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  academicSessionId: string;

  @ApiProperty({
    description: 'Term ID',
    example: 'term-uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  termId: string;

  @ApiProperty({
    description: 'Array of student attendance records for this subject',
    type: [SubjectStudentAttendanceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectStudentAttendanceDto)
  studentAttendances: SubjectStudentAttendanceDto[];
}
