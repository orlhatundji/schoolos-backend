import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

export function TeacherDashboardSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get teacher dashboard core statistics',
      description: `
        Retrieve core dashboard statistics for a teacher including:
        - Total classes, students, and subjects assigned
        - Average class size and attendance rate
        - Pending and completed assessments count
        - Current academic session information
      `,
    }),
    ApiResponse({
      status: 200,
      description: 'Teacher dashboard data retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          stats: {
            type: 'object',
            properties: {
              totalClasses: { type: 'number', example: 5 },
              totalStudents: { type: 'number', example: 120 },
              totalSubjects: { type: 'number', example: 3 },
              averageClassSize: { type: 'number', example: 24.0 },
              attendanceRate: { type: 'number', example: 87.5 },
              pendingAssessments: { type: 'number', example: 3 },
              completedAssessments: { type: 'number', example: 12 },
            },
          },
          academicInfo: {
            type: 'object',
            properties: {
              currentSession: { type: 'string', example: '2024/2025' },
              currentTerm: { type: 'string', example: 'First Term' },
              sessionStartDate: { type: 'string', format: 'date-time' },
              sessionEndDate: { type: 'string', format: 'date-time' },
              daysRemaining: { type: 'number', example: 45 },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiResponse({
      status: 404,
      description: 'Teacher not found or not associated with a school',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
