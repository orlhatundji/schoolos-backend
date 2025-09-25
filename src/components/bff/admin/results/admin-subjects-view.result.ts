import { ApiProperty } from '@nestjs/swagger';
import { SubjectsViewData } from '../types';
import { SubjectCategory } from '@prisma/client';

export class SubjectStatsResult {
  @ApiProperty({ description: 'Total number of subjects in the school' })
  totalSubjects: number;

  @ApiProperty({
    description: 'Breakdown of subjects by category',
    type: 'object',
    properties: {
      core: { type: 'number', description: 'Number of core subjects' },
      general: { type: 'number', description: 'Number of general subjects' },
      vocational: { type: 'number', description: 'Number of vocational subjects' },
    },
  })
  categoryBreakdown: {
    core: number;
    general: number;
    vocational: number;
  };

  @ApiProperty({
    description: 'Breakdown of subjects by department',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  departmentBreakdown: {
    [departmentName: string]: number;
  };
}

export class SubjectInfoResult {
  @ApiProperty({ description: 'Subject ID' })
  id: string;

  @ApiProperty({ description: 'Subject name' })
  name: string;

  @ApiProperty({ description: 'Department name', nullable: true })
  department: string | null;

  @ApiProperty({
    description: 'Subject category name',
    nullable: true,
  })
  category: string | null;

  @ApiProperty({ description: 'Number of classes taking this subject' })
  classesCount: number;

  @ApiProperty({ description: 'Number of students taking this subject' })
  studentCount: number;

  @ApiProperty({
    description: 'Subject status',
    enum: ['active', 'inactive'],
  })
  status: 'active' | 'inactive';
}

export class AdminSubjectsViewResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ type: SubjectStatsResult, description: 'Subject statistics' })
  stats: SubjectStatsResult;

  @ApiProperty({ type: [SubjectInfoResult], description: 'List of subjects' })
  subjects: SubjectInfoResult[];

  constructor(data: SubjectsViewData) {
    this.success = true;
    this.stats = data.stats;
    this.subjects = data.subjects;
  }
}
