import { ApiProperty } from '@nestjs/swagger';

import { StudentResultsData } from '../types';

export class StudentResultsResult {
  @ApiProperty({
    description: 'Student academic results data',
    example: {
      student: {
        id: 'student_001',
        studentNo: 'STU2024001',
        fullName: 'John Doe',
        classArm: {
          id: 'class_arm_001',
          name: 'A',
          level: {
            id: 'level_001',
            name: 'JSS1',
          },
        },
      },
      academicSession: {
        id: 'session_001',
        academicYear: '2024/2025',
        isCurrent: true,
      },
      term: {
        id: 'term_001',
        name: 'First Term',
        startDate: '2024-09-01T00:00:00.000Z',
        endDate: '2024-12-20T00:00:00.000Z',
      },
      subjects: [
        {
          id: 'subject_001',
          name: 'Mathematics',
          code: 'MATH',
          totalScore: 85,
          averageScore: 85.0,
          grade: 'A',
          assessments: [
            {
              id: 'assessment_001',
              name: 'Test 1',
              score: 18,
              maxScore: 20,
              isExam: false,
              date: '2024-10-15T10:00:00.000Z',
            },
            {
              id: 'assessment_002',
              name: 'Exam',
              score: 55,
              maxScore: 60,
              isExam: true,
              date: '2024-11-20T09:00:00.000Z',
            },
          ],
        },
      ],
      overallStats: {
        totalSubjects: 8,
        totalScore: 680,
        averageScore: 85.0,
        position: 5,
        totalStudents: 45,
        grade: 'A',
      },
    },
  })
  data: StudentResultsData;

  constructor(resultsData: StudentResultsData) {
    this.data = resultsData;
  }
}
