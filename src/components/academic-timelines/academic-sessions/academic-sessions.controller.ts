import { Controller, Get, Post, Body, Param, Patch, Delete, HttpStatus } from '@nestjs/common';
import { AcademicSessionsService } from './academic-sessions.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AcademicSessionMessages,
  AcademicSessionResult,
  ManyAcademicSessionsResult,
} from './results';

@Controller('academic-sessions')
@ApiTags('Academic Sessions')
export class AcademicSessionsController {
  constructor(private readonly academicSessionsService: AcademicSessionsService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AcademicSessionResult,
    description: AcademicSessionMessages.SUCCESS.SESSION_CREATED_SUCCESSFULLY,
  })
  async create(@Body() data: CreateAcademicSessionDto): Promise<AcademicSessionResult> {
    const academicSession = await this.academicSessionsService.createAcademicSession(data);

    return AcademicSessionResult.from(academicSession, {
      status: HttpStatus.CREATED,
      message: AcademicSessionMessages.SUCCESS.SESSION_CREATED_SUCCESSFULLY,
    });
  }

  @Get()
  async findAll() {
    const academicSessions = await this.academicSessionsService.getAllAcademicSessions();

    return ManyAcademicSessionsResult.from(academicSessions, {
      status: HttpStatus.OK,
      message: AcademicSessionMessages.SUCCESS.SESSION_FETCHED_SUCCESSFULLY,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const academicSession = await this.academicSessionsService.getAcademicSessionById(id);

    return AcademicSessionResult.from(academicSession, {
      status: HttpStatus.OK,
      message: AcademicSessionMessages.SUCCESS.SESSION_FETCHED_SUCCESSFULLY,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateAcademicSessionDto,
  ): Promise<AcademicSessionResult> {
    const academicSession = await this.academicSessionsService.updateAcademicSession(id, data);
    return AcademicSessionResult.from(academicSession, {
      status: HttpStatus.OK,
      message: AcademicSessionMessages.SUCCESS.SESSION_UPDATED_SUCCESSFULLY,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<AcademicSessionResult> {
    const academicSession = await this.academicSessionsService.deleteAcademicSession(id);
    return AcademicSessionResult.from(academicSession, {
      status: HttpStatus.OK,
      message: AcademicSessionMessages.SUCCESS.SESSION_DELETED_SUCCESSFULLY,
    });
  }
}
