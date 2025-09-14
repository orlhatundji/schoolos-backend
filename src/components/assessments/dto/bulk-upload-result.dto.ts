import { ApiProperty } from '@nestjs/swagger';

export class BulkUploadSuccessItemDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'student-uuid',
  })
  studentId: string;

  @ApiProperty({
    description: 'Student name',
    example: 'John Doe',
  })
  studentName: string;

  @ApiProperty({
    description: 'Assessment name',
    example: 'Test 1',
  })
  assessmentName: string;

  @ApiProperty({
    description: 'Score achieved',
    example: 85,
  })
  score: number;

  @ApiProperty({
    description: 'Whether this is an exam',
    example: false,
  })
  isExam: boolean;
}

export class BulkUploadFailedItemDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'student-uuid',
  })
  studentId: string;

  @ApiProperty({
    description: 'Student name',
    example: 'John Doe',
  })
  studentName: string;

  @ApiProperty({
    description: 'Assessment name',
    example: 'Test 1',
  })
  assessmentName: string;

  @ApiProperty({
    description: 'Score attempted',
    example: 85,
  })
  score: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Score must be between 0 and 100',
  })
  error: string;
}

export class BulkUploadResultDto {
  @ApiProperty({
    description: 'Successfully processed assessment scores',
    type: [BulkUploadSuccessItemDto],
  })
  success: BulkUploadSuccessItemDto[];

  @ApiProperty({
    description: 'Failed assessment scores with error details',
    type: [BulkUploadFailedItemDto],
  })
  failed: BulkUploadFailedItemDto[];
}
