import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { GetCalendarEventsDto } from './dto/get-calendar-events.dto';
import { AcademicCalendarEvent } from './types/academic-calendar-event';

@Injectable()
export class AcademicCalendarRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    calendarId: string;
    title: string;
    startDate: Date;
    endDate?: Date | null;
  }): Promise<AcademicCalendarEvent> {
    return this.prisma.academicSessionCalendarItem.create({
      data,
      include: {
        calendar: {
          include: {
            academicSession: {
              include: {
                terms: true,
              },
            },
          },
        },
      },
    });
  }

  async findByIdWithAccess(userId: string, eventId: string): Promise<AcademicCalendarEvent | null> {
    return this.prisma.academicSessionCalendarItem.findFirst({
      where: {
        id: eventId,
        calendar: {
          academicSession: {
            school: {
              users: {
                some: {
                  id: userId,
                },
              },
            },
          },
        },
      },
      include: {
        calendar: {
          include: {
            academicSession: {
              include: {
                terms: true,
              },
            },
          },
        },
      },
    });
  }

  async findEventsByFilters(
    schoolId: string,
    query: GetCalendarEventsDto,
  ): Promise<AcademicCalendarEvent[]> {
    const where: any = {
      calendar: {
        academicSession: {
          schoolId,
        },
      },
    };

    // Filter by academic session
    if (query.academicSessionId) {
      where.calendar.academicSessionId = query.academicSessionId;
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      where.startDate = {};
      if (query.startDate) {
        where.startDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startDate.lte = new Date(query.endDate);
      }
    }

    // Filter by month and year
    if (query.month && query.year) {
      const startOfMonth = new Date(query.year, query.month - 1, 1);
      const endOfMonth = new Date(query.year, query.month, 0, 23, 59, 59, 999);

      where.startDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (query.year) {
      const startOfYear = new Date(query.year, 0, 1);
      const endOfYear = new Date(query.year, 11, 31, 23, 59, 59, 999);

      where.startDate = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    // Filter by term (if term dates overlap with event dates)
    if (query.termId) {
      // This would require a more complex query to check if event dates fall within term dates
      // For now, we'll include term information in the response
    }

    const skip = (query.page - 1) * query.limit;

    return this.prisma.academicSessionCalendarItem.findMany({
      where,
      include: {
        calendar: {
          include: {
            academicSession: {
              include: {
                terms: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
      skip,
      take: query.limit,
    });
  }

  async update(where: { id: string }, data: any): Promise<AcademicCalendarEvent> {
    return this.prisma.academicSessionCalendarItem.update({
      where,
      data,
      include: {
        calendar: {
          include: {
            academicSession: {
              include: {
                terms: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(where: { id: string }): Promise<AcademicCalendarEvent> {
    return this.prisma.academicSessionCalendarItem.delete({
      where,
      include: {
        calendar: {
          include: {
            academicSession: {
              include: {
                terms: true,
              },
            },
          },
        },
      },
    });
  }

  async findCalendarByAcademicSession(academicSessionId: string): Promise<AcademicCalendarEvent[]> {
    return this.prisma.academicSessionCalendarItem.findMany({
      where: {
        calendar: {
          academicSessionId,
        },
      },
      include: {
        calendar: {
          include: {
            academicSession: {
              include: {
                terms: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }
}
