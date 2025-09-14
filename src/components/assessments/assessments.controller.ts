import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AssessmentService } from './assessments.service';
import { AssessmentResult, ManyAssessmentsResult } from './results/assessment-result';
import { AssessmentMessages } from './results/messages';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { GenerateTemplateDto } from './dto/generate-template.dto';
import { BulkUploadResult } from './results/bulk-upload-result';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import { AccessTokenGuard } from '../../components/auth/strategies/jwt/guards/access-token.guard';
import { UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Assessments')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(
    private readonly assessmentService: AssessmentService,
    private readonly prisma: PrismaService,
  ) {}

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

  @Get('bulk-upload/debug')
  @ApiOperation({
    summary: 'Debug endpoint to check available data for template generation',
    description: 'Returns available subjects, terms, sessions, levels, and class arms for the teacher\'s school',
  })
  @ApiResponse({ status: 200, description: 'Debug information retrieved successfully' })
  async getDebugInfo(@GetCurrentUserId() userId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get all available data
    const [subjects, academicSessions, levels, assessmentStructures] = await Promise.all([
      this.prisma.subject.findMany({
        where: { schoolId: user.schoolId, deletedAt: null },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.academicSession.findMany({
        where: { schoolId: user.schoolId, deletedAt: null },
        select: { academicYear: true },
        orderBy: { academicYear: 'desc' },
      }),
      this.prisma.level.findMany({
        where: { schoolId: user.schoolId, deletedAt: null },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.assessmentStructure.findMany({
        where: { schoolId: user.schoolId, isActive: true, deletedAt: null },
        select: { name: true, maxScore: true, isExam: true },
        orderBy: { order: 'asc' },
      }),
    ]);

    // Get terms for the first academic session (if any)
    let terms: any[] = [];
    if (academicSessions.length > 0) {
      terms = await this.prisma.term.findMany({
        where: { 
          academicSession: { 
            academicYear: academicSessions[0].academicYear,
            schoolId: user.schoolId,
          },
          deletedAt: null,
        },
        select: { name: true },
        orderBy: { name: 'asc' },
      });
    }

    // Get class arms for the first level (if any)
    let classArms: any[] = [];
    if (levels.length > 0) {
      classArms = await this.prisma.classArm.findMany({
        where: { 
          level: { 
            name: levels[0].name,
            schoolId: user.schoolId,
          },
          schoolId: user.schoolId,
          deletedAt: null,
        },
        select: { name: true, level: { select: { name: true } } },
        orderBy: { name: 'asc' },
      });
    }

    return {
      schoolId: user.schoolId,
      subjects: subjects.map(s => s.name),
      academicSessions: academicSessions.map(s => s.academicYear),
      terms: terms.map(t => t.name),
      levels: levels.map(l => l.name),
      classArms: classArms.map(ca => `${ca.level.name}${ca.name}`),
      assessmentStructures: assessmentStructures,
    };
  }

  @Post('bulk-upload/template')
  @ApiOperation({
    summary: 'Generate Excel template for bulk assessment score upload',
    description:
      'Generates an Excel template with students and assessment columns based on school assessment structure. Existing scores are pre-populated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel template generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subject term or students not found' })
  async generateTemplate(
    @GetCurrentUserId() userId: string,
    @Body() generateTemplateDto: GenerateTemplateDto,
    @Res() res: Response,
  ) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const templateBuffer = await this.assessmentService.generateTemplate(
      user.schoolId,
      userId,
      generateTemplateDto,
    );

    const filename = `assessment-template-${generateTemplateDto.subjectName}-${generateTemplateDto.levelName}${generateTemplateDto.classArmName}-${generateTemplateDto.termName}-${Date.now()}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': templateBuffer.length.toString(),
    });

    res.send(templateBuffer);
  }

  @Post('bulk-upload/process')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Process uploaded Excel file for bulk assessment score upload',
    description:
      'Processes an Excel file containing assessment scores and updates student records. The file must be generated using the template endpoint.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Excel file processed successfully',
    type: BulkUploadResult,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - teacher not authorized for this subject' })
  async processBulkUpload(
    @GetCurrentUserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.xlsx') && !file.originalname.endsWith('.xls')) {
      throw new BadRequestException('Only Excel files (.xlsx, .xls) are allowed');
    }

    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const result = await this.assessmentService.processBulkUpload(
      file.buffer,
      user.schoolId,
      userId,
    );

    const successCount = result.success.length;
    const failedCount = result.failed.length;
    const message = `Bulk upload completed. ${successCount} successful, ${failedCount} failed.`;

    return BulkUploadResult.from(result, {
      status: HttpStatus.OK,
      message,
    });
  }
}
