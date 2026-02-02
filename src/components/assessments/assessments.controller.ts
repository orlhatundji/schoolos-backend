import {
  Controller,
  Post,
  Body,
  Get,
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
import { GenerateTemplateDto } from './dto/generate-template.dto';
import { BulkUploadResult } from './results/bulk-upload-result';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import { AccessTokenGuard } from '../../components/auth/strategies/jwt/guards/access-token.guard';
import { UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssessmentStructureTemplateService } from '../assessment-structures/assessment-structure-template.service';

@ApiTags('Assessments')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(
    private readonly assessmentService: AssessmentService,
    private readonly prisma: PrismaService,
    private readonly templateService: AssessmentStructureTemplateService,
  ) {}

  @Get('bulk-upload/debug')
  @ApiOperation({
    summary: 'Debug endpoint to check available data for template generation',
    description: 'Returns available subjects, terms, sessions, levels, and class arms for the teacher\'s school',
  })
  @ApiResponse({ status: 200, description: 'Debug information retrieved successfully' })
  async getDebugInfo(@GetCurrentUserId() userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const [subjects, academicSessions, levels] = await Promise.all([
      this.prisma.subject.findMany({
        where: { schoolId: user.schoolId, deletedAt: null },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.academicSession.findMany({
        where: { schoolId: user.schoolId, deletedAt: null },
        select: { id: true, academicYear: true, isCurrent: true },
        orderBy: { academicYear: 'desc' },
      }),
      this.prisma.level.findMany({
        where: { schoolId: user.schoolId, deletedAt: null },
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Get assessment structures from the active template for current session
    let assessmentStructures: any[] = [];
    const currentSession = academicSessions.find((s) => s.isCurrent);
    if (currentSession) {
      try {
        const template = await this.templateService.findActiveTemplateForSchoolSession(
          user.schoolId,
          currentSession.id,
        );
        assessmentStructures = (template.assessments as any[]).map((a: any) => ({
          id: a.id,
          name: a.name,
          maxScore: a.maxScore,
          isExam: a.isExam,
        }));
      } catch {
        // Template might not exist yet
      }
    }

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
      subjects: subjects.map((s) => s.name),
      academicSessions: academicSessions.map((s) => s.academicYear),
      terms: terms.map((t) => t.name),
      levels: levels.map((l) => l.name),
      classArms: classArms.map((ca) => `${ca.level.name}${ca.name}`),
      assessmentStructures,
    };
  }

  @Post('bulk-upload/template')
  @ApiOperation({
    summary: 'Generate Excel template for bulk assessment score upload',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel template generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async generateTemplate(
    @GetCurrentUserId() userId: string,
    @Body() generateTemplateDto: GenerateTemplateDto,
    @Res() res: Response,
  ) {
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
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Excel file processed successfully', type: BulkUploadResult })
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
