import { ApiProperty } from '@nestjs/swagger';

import { StudentDashboardData } from '../types';

export class StudentDashboardResult {
  @ApiProperty({
    description: 'Student dashboard data',
    example: {
      student: {
        id: 'student_001',
        studentNo: 'STU2024001',
        fullName: 'John Doe',
        avatarUrl: '/avatars/john_doe.jpg',
        classArm: {
          id: 'class_arm_001',
          name: 'A',
          level: {
            id: 'level_001',
            name: 'JSS1',
          },
        },
      },
      academicInfo: {
        currentSession: {
          id: 'session_001',
          academicYear: '2024/2025',
          isCurrent: true,
        },
        currentTerm: {
          id: 'term_001',
          name: 'First Term',
          startDate: '2024-09-01T00:00:00.000Z',
          endDate: '2024-12-20T00:00:00.000Z',
        },
      },
      statistics: {
        totalSubjects: 8,
        averageScore: 75.5,
        attendanceRate: 92.3,
        totalAssessments: 24,
      },
      recentActivities: [
        {
          id: 'activity_001',
          type: 'ASSESSMENT',
          title: 'Mathematics Test 1',
          description: 'Scored 85/100',
          date: '2024-10-15T10:00:00.000Z',
          subjectName: 'Mathematics',
        },
      ],
      upcomingEvents: [
        {
          id: 'event_001',
          title: 'English Exam',
          description: 'Mid-term examination',
          date: '2024-11-20T09:00:00.000Z',
          type: 'EXAM',
        },
      ],
    },
  })
  data: StudentDashboardData;

  constructor(dashboardData: StudentDashboardData) {
    this.data = dashboardData;
  }
}
