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
    @Body('termId') termId?: string,
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
      termId,
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
