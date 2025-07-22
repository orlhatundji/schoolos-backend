import { Controller, Post, Body, Get, Param, Put, Delete, Query, HttpStatus } from '@nestjs/common';
import { AssessmentService } from './assessments.service';
import { AssessmentResult, ManyAssessmentsResult } from './results/assessment-result';
import { AssessmentMessages } from './results/messages';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Assessments')
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post()
  async create(@Body() createAssessmentDto: CreateAssessmentDto) {
    const assessment = await this.assessmentService.create(createAssessmentDto);
    return AssessmentResult.from(assessment, {
      status: HttpStatus.CREATED,
      message: AssessmentMessages.SUCCESS.CREATED,
    });
  }

  @Get()
  async findAll(@Query('schoolId') schoolId: string) {
    const assessments = await this.assessmentService.findAll(schoolId);
    return ManyAssessmentsResult.from(assessments, {
      status: HttpStatus.OK,
      message: AssessmentMessages.SUCCESS.FOUND,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const assessment = await this.assessmentService.findOne(id);
    return AssessmentResult.from(assessment, {
      status: HttpStatus.OK,
      message: AssessmentMessages.SUCCESS.FOUND,
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateAssessmentDto: UpdateAssessmentDto) {
    const assessment = await this.assessmentService.update(id, updateAssessmentDto);
    return AssessmentResult.from(assessment, {
      status: HttpStatus.OK,
      message: AssessmentMessages.SUCCESS.UPDATED,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const assessment = await this.assessmentService.remove(id);
    return AssessmentResult.from(assessment, {
      status: HttpStatus.OK,
      message: AssessmentMessages.SUCCESS.DELETED,
    });
  }
}
