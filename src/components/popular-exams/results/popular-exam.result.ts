import { ApiProperty } from '@nestjs/swagger';

export class PopularExamResult {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'WAEC' })
  code: string;

  @ApiProperty({ example: 'West African Examinations Council' })
  name: string;

  @ApiProperty({ example: 'NG', nullable: true })
  country: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2026-04-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-25T00:00:00.000Z' })
  updatedAt: Date;

  constructor(exam: {
    id: string;
    code: string;
    name: string;
    country: string | null;
    description: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = exam.id;
    this.code = exam.code;
    this.name = exam.name;
    this.country = exam.country;
    this.description = exam.description;
    this.active = exam.active;
    this.createdAt = exam.createdAt;
    this.updatedAt = exam.updatedAt;
  }
}

export class PopularExamsListResult {
  @ApiProperty({ type: [PopularExamResult] })
  popularExams: PopularExamResult[];

  constructor(exams: PopularExamResult[]) {
    this.popularExams = exams;
  }
}

export class CreatePopularExamResult {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Popular exam created successfully' })
  message: string;

  @ApiProperty({ type: PopularExamResult })
  popularExam: PopularExamResult;

  constructor(exam: PopularExamResult) {
    this.success = true;
    this.message = 'Popular exam created successfully';
    this.popularExam = exam;
  }
}

export class UpdatePopularExamResult {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Popular exam updated successfully' })
  message: string;

  @ApiProperty({ type: PopularExamResult })
  popularExam: PopularExamResult;

  constructor(exam: PopularExamResult) {
    this.success = true;
    this.message = 'Popular exam updated successfully';
    this.popularExam = exam;
  }
}

export class DeletePopularExamResult {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Popular exam deleted successfully' })
  message: string;

  constructor() {
    this.success = true;
    this.message = 'Popular exam deleted successfully';
  }
}
