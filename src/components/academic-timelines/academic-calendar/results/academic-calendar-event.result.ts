import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { BaseResultWithData } from '../../../../common/results';

import type { AcademicCalendarEvent } from '../types/academic-calendar-event';

export class AcademicCalendarEventResult extends BaseResultWithData<AcademicCalendarEvent> {
  @ApiProperty({
    description: 'Calendar event data',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'uuid' },
      title: { type: 'string', example: 'First Term Begins' },
      startDate: { type: 'string', format: 'date-time', example: '2024-09-01T00:00:00.000Z' },
      endDate: {
        type: 'string',
        format: 'date-time',
        example: '2024-09-01T23:59:59.000Z',
        nullable: true,
      },
      createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
      calendar: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid' },
          academicSession: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              academicYear: { type: 'string', example: '2024/2025' },
              startDate: {
                type: 'string',
                format: 'date-time',
                example: '2024-09-01T00:00:00.000Z',
              },
              endDate: { type: 'string', format: 'date-time', example: '2025-07-31T23:59:59.000Z' },
              isCurrent: { type: 'boolean', example: true },
              terms: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'uuid' },
                    name: { type: 'string', example: 'First Term' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  data: AcademicCalendarEvent;

  static from(
    event: AcademicCalendarEvent,
    options: { status: HttpStatus; message: string },
  ): AcademicCalendarEventResult {
    return new AcademicCalendarEventResult(options.status, options.message, event);
  }
}
