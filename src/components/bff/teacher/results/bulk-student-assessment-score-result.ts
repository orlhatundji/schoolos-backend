import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { BaseResultWithData } from '../../../../common/results';

export interface StudentAssessmentScoreData {
  id: string;
  name: string;
  score: number;
  isExam: boolean;
  studentId: string;
  studentName: string;
  subjectName: string;
  termName: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface BulkStudentAssessmentScoreResult {
  success: StudentAssessmentScoreData[];
  failed: {
    assessmentScore: any;
    error: string;
  }[];
}

export class BulkStudentAssessmentScoreResultClass extends BaseResultWithData<BulkStudentAssessmentScoreResult> {
  @ApiProperty({
    description: 'Result of bulk operation',
    example: {
      success: [
        {
          id: 'assessment-score-1',
          name: 'Test 1',
          score: 18,
          isExam: false,
          studentId: 'student-123',
          studentName: 'Jane Smith',
          subjectName: 'Mathematics',
          termName: 'First Term',
          createdAt: '2025-01-15T10:00:00Z',
        },
      ],
      failed: [
        {
          assessmentScore: {
            studentId: 'student-456',
            subjectName: 'Mathematics',
            termName: 'First Term',
            assessmentName: 'Test 1',
            score: 25,
          },
          error: 'Student not found',
        },
      ],
    },
  })
  public data: BulkStudentAssessmentScoreResult;

  public static from(
    result: BulkStudentAssessmentScoreResult,
    options: { message: string; status: HttpStatus },
  ): BulkStudentAssessmentScoreResultClass {
    return new BulkStudentAssessmentScoreResultClass(options.status, options.message, result);
  }
}
