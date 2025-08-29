import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../../roles-manager';
import { ManageStudentPolicyHandler } from '../../students/policies';
import { AcademicCalendarService } from './academic-calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { GetCalendarEventsDto } from './dto/get-calendar-events.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import {
  AcademicCalendarEventResult,
  AcademicCalendarMessages,
  ManyAcademicCalendarEventsResult,
} from './results';

@Controller('academic-calendar')
@ApiTags('Academic Calendar')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class AcademicCalendarController {
  constructor(private readonly academicCalendarService: AcademicCalendarService) {}

  @Post('events')
  @CheckPolicies(new ManageStudentPolicyHandler())
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AcademicCalendarEventResult,
    description: AcademicCalendarMessages.SUCCESS.EVENT_CREATED_SUCCESSFULLY,
  })
  async createEvent(
    @GetCurrentUserId() userId: string,
    @Body() data: CreateCalendarEventDto,
  ): Promise<AcademicCalendarEventResult> {
    const event = await this.academicCalendarService.createEvent(userId, data);

    return AcademicCalendarEventResult.from(event, {
      status: HttpStatus.CREATED,
      message: AcademicCalendarMessages.SUCCESS.EVENT_CREATED_SUCCESSFULLY,
    });
  }

  @Get('events')
  @CheckPolicies(new ManageStudentPolicyHandler())
  @ApiResponse({
    status: HttpStatus.OK,
    type: ManyAcademicCalendarEventsResult,
    description: AcademicCalendarMessages.SUCCESS.EVENTS_FETCHED_SUCCESSFULLY,
  })
  async getEvents(
    @GetCurrentUserId() userId: string,
    @Query() query: GetCalendarEventsDto,
  ): Promise<ManyAcademicCalendarEventsResult> {
    const events = await this.academicCalendarService.getEvents(userId, query);

    return new ManyAcademicCalendarEventsResult(
      HttpStatus.OK,
      AcademicCalendarMessages.SUCCESS.EVENTS_FETCHED_SUCCESSFULLY,
      events,
    );
  }

  @Get('events/:id')
  @CheckPolicies(new ManageStudentPolicyHandler())
  @ApiResponse({
    status: HttpStatus.OK,
    type: AcademicCalendarEventResult,
    description: AcademicCalendarMessages.SUCCESS.EVENT_FETCHED_SUCCESSFULLY,
  })
  async getEvent(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<AcademicCalendarEventResult> {
    const event = await this.academicCalendarService.getEventById(userId, id);

    return AcademicCalendarEventResult.from(event, {
      status: HttpStatus.OK,
      message: AcademicCalendarMessages.SUCCESS.EVENT_FETCHED_SUCCESSFULLY,
    });
  }

  @Patch('events/:id')
  @CheckPolicies(new ManageStudentPolicyHandler())
  @ApiResponse({
    status: HttpStatus.OK,
    type: AcademicCalendarEventResult,
    description: AcademicCalendarMessages.SUCCESS.EVENT_UPDATED_SUCCESSFULLY,
  })
  async updateEvent(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() data: UpdateCalendarEventDto,
  ): Promise<AcademicCalendarEventResult> {
    const event = await this.academicCalendarService.updateEvent(userId, id, data);

    return AcademicCalendarEventResult.from(event, {
      status: HttpStatus.OK,
      message: AcademicCalendarMessages.SUCCESS.EVENT_UPDATED_SUCCESSFULLY,
    });
  }

  @Delete('events/:id')
  @CheckPolicies(new ManageStudentPolicyHandler())
  @ApiResponse({
    status: HttpStatus.OK,
    type: AcademicCalendarEventResult,
    description: AcademicCalendarMessages.SUCCESS.EVENT_DELETED_SUCCESSFULLY,
  })
  async deleteEvent(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<AcademicCalendarEventResult> {
    const event = await this.academicCalendarService.deleteEvent(userId, id);

    return AcademicCalendarEventResult.from(event, {
      status: HttpStatus.OK,
      message: AcademicCalendarMessages.SUCCESS.EVENT_DELETED_SUCCESSFULLY,
    });
  }

  @Get('calendar')
  @CheckPolicies(new ManageStudentPolicyHandler())
  @ApiResponse({
    status: HttpStatus.OK,
    type: ManyAcademicCalendarEventsResult,
    description: AcademicCalendarMessages.SUCCESS.CALENDAR_FETCHED_SUCCESSFULLY,
  })
  async getCalendar(
    @GetCurrentUserId() userId: string,
    @Query() query: GetCalendarEventsDto,
  ): Promise<ManyAcademicCalendarEventsResult> {
    const calendar = await this.academicCalendarService.getCalendar(userId, query);

    return new ManyAcademicCalendarEventsResult(
      HttpStatus.OK,
      AcademicCalendarMessages.SUCCESS.CALENDAR_FETCHED_SUCCESSFULLY,
      calendar,
    );
  }
}
