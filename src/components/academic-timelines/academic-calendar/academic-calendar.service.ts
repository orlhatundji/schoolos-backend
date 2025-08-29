import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { BaseService } from '../../../common/base-service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AcademicCalendarRepository } from './academic-calendar.repository';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { GetCalendarEventsDto } from './dto/get-calendar-events.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { AcademicCalendarMessages } from './results/messages';
import { AcademicCalendarEvent } from './types/academic-calendar-event';

@Injectable()
export class AcademicCalendarService extends BaseService {
  constructor(
    private readonly academicCalendarRepository: AcademicCalendarRepository,
    private readonly prisma: PrismaService,
  ) {
    super(AcademicCalendarService.name);
  }

  async createEvent(userId: string, dto: CreateCalendarEventDto): Promise<AcademicCalendarEvent> {
    // Verify the academic session exists and user has access to it
    const academicSession = await this.prisma.academicSession.findFirst({
      where: {
        id: dto.academicSessionId,
        school: {
          users: {
            some: {
              id: userId,
            },
          },
        },
      },
    });

    if (!academicSession) {
      throw new NotFoundException(AcademicCalendarMessages.FAILURE.ACADEMIC_SESSION_NOT_FOUND);
    }

    // Check if calendar exists for the academic session, create if not
    let calendar = await this.prisma.academicSessionCalendar.findUnique({
      where: { academicSessionId: dto.academicSessionId },
    });

    if (!calendar) {
      calendar = await this.prisma.academicSessionCalendar.create({
        data: {
          academicSessionId: dto.academicSessionId,
        },
      });
    }

    // Create the calendar event
    const event = await this.academicCalendarRepository.create({
      calendarId: calendar.id,
      title: dto.title,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });

    return event;
  }

  async getEvents(userId: string, query: GetCalendarEventsDto): Promise<AcademicCalendarEvent[]> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException(
        AcademicCalendarMessages.FAILURE.USER_NOT_ASSOCIATED_WITH_SCHOOL,
      );
    }

    return this.academicCalendarRepository.findEventsByFilters(user.schoolId, query);
  }

  async getEventById(userId: string, eventId: string): Promise<AcademicCalendarEvent> {
    const event = await this.academicCalendarRepository.findByIdWithAccess(userId, eventId);

    if (!event) {
      throw new NotFoundException(AcademicCalendarMessages.FAILURE.EVENT_NOT_FOUND);
    }

    return event;
  }

  async updateEvent(
    userId: string,
    eventId: string,
    dto: UpdateCalendarEventDto,
  ): Promise<AcademicCalendarEvent> {
    // Verify event exists and user has access
    const existingEvent = await this.academicCalendarRepository.findByIdWithAccess(userId, eventId);

    if (!existingEvent) {
      throw new NotFoundException(AcademicCalendarMessages.FAILURE.EVENT_NOT_FOUND);
    }

    const updateData: any = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }

    if (dto.startDate !== undefined) {
      updateData.startDate = new Date(dto.startDate);
    }

    if (dto.endDate !== undefined) {
      updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    return this.academicCalendarRepository.update({ id: eventId }, updateData);
  }

  async deleteEvent(userId: string, eventId: string): Promise<AcademicCalendarEvent> {
    // Verify event exists and user has access
    const existingEvent = await this.academicCalendarRepository.findByIdWithAccess(userId, eventId);

    if (!existingEvent) {
      throw new NotFoundException(AcademicCalendarMessages.FAILURE.EVENT_NOT_FOUND);
    }

    return this.academicCalendarRepository.delete({ id: eventId });
  }

  async getCalendar(userId: string, query: GetCalendarEventsDto): Promise<AcademicCalendarEvent[]> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException(
        AcademicCalendarMessages.FAILURE.USER_NOT_ASSOCIATED_WITH_SCHOOL,
      );
    }

    // For calendar view, we might want to include additional context like terms
    return this.academicCalendarRepository.findEventsByFilters(user.schoolId, query);
  }
}
