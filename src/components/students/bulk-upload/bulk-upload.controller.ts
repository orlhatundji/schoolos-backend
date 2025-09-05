import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';

import { BulkUploadService, TemplateService } from './services';
import { BulkUploadOptionsDto } from './dto';
import { StrategyEnum } from '../../auth/strategies';
import { CheckPolicies } from '../../roles-manager/policies/check-policies.decorator';
import { ManageStudentPolicyHandler } from '../policies/student-policy.handler';

@Controller('students/bulk-import')
@ApiTags('Student Bulk Import')
@ApiBearerAuth(StrategyEnum.JWT)
export class BulkUploadController {
  constructor(
    private readonly bulkUploadService: BulkUploadService,
    private readonly templateService: TemplateService,
  ) {}

  @Get('template')
  @ApiOperation({
    summary: 'Download CSV template for bulk student upload',
    description:
      'Downloads a CSV template with sample data and column descriptions for bulk student upload',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV template file download',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async downloadTemplate(@Request() req: any, @Res() res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School ID not found in user context');
    }

    await this.templateService.generateCsvTemplate(schoolId, res);
  }

  @Get('template/excel')
  @ApiOperation({
    summary: 'Download Excel template with dropdowns for bulk student upload',
    description:
      'Downloads an Excel template with dropdown lists for gender and class selection, plus detailed instructions',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Excel template file download',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async downloadExcelTemplate(@Request() req: any, @Res() res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School ID not found in user context');
    }

    await this.templateService.generateExcelTemplate(schoolId, res);
  }

  @Get('template/google-sheets')
  @ApiOperation({
    summary: 'Download Google Sheets compatible template for bulk student upload',
    description:
      'Downloads a CSV template optimized for Google Sheets with class options in a separate sheet',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV template file download',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async downloadGoogleSheetsTemplate(@Request() req: any, @Res() res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School ID not found in user context');
    }

    await this.templateService.generateGoogleSheetsTemplate(schoolId, res);
  }

  @Get('template/exceljs')
  @ApiOperation({
    summary: 'Download Excel template with working dropdowns (ExcelJS)',
    description:
      'Downloads an Excel template created with ExcelJS library that has reliable dropdown functionality',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Excel template file download with working dropdowns',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async downloadExcelJSTemplate(@Request() req: any, @Res() res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School ID not found in user context');
    }

    await this.templateService.generateExcelJSTemplate(schoolId, res);
  }

  @Get('template/instructions')
  @ApiOperation({
    summary: 'Get template instructions and field descriptions',
    description: 'Returns detailed instructions for preparing bulk upload data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template instructions and field descriptions',
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getTemplateInstructions() {
    return this.templateService.getTemplateInstructions();
  }

  @Get('template/class-arms')
  @ApiOperation({
    summary: 'Get available class arms for template',
    description:
      'Returns list of available class arms that can be used in the bulk upload template',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of available class arms',
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getClassArmsForTemplate(@Request() req: any) {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School ID not found in user context');
    }

    return this.templateService.getClassArmsForTemplate(schoolId);
  }

  @Post('upload')
  @ApiOperation({
    summary: 'Upload file for bulk student import',
    description: 'Uploads a CSV or Excel file containing student data for bulk import processing',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded successfully and processing started',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
            message: { type: 'string' },
            estimatedTime: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'File validation failed or invalid format',
  })
  @UseInterceptors(FileInterceptor('file'))
  @CheckPolicies(new ManageStudentPolicyHandler())
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const schoolId = req.user?.schoolId;
    const userId = req.user?.sub; // JWT stores user ID as 'sub'

    if (!schoolId || !userId) {
      throw new BadRequestException('School ID or User ID not found in user context');
    }

    // Parse options from form data
    let options: BulkUploadOptionsDto = {};
    if (body.options) {
      try {
        options = JSON.parse(body.options);
      } catch {
        throw new BadRequestException('Invalid options format. Must be valid JSON.');
      }
    }

    const result = await this.bulkUploadService.uploadFile(file, options, schoolId, userId);

    return {
      success: true,
      data: {
        jobId: result.jobId,
        message: 'File uploaded successfully. Processing started.',
        estimatedTime: '5-10 minutes',
      },
    };
  }

  @Get('status/:jobId')
  @ApiOperation({
    summary: 'Get bulk import job status',
    description: 'Returns the current status and progress of a bulk import job',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job status and progress information',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
            progress: {
              type: 'object',
              properties: {
                totalRecords: { type: 'number' },
                processed: { type: 'number' },
                successful: { type: 'number' },
                failed: { type: 'number' },
                percentage: { type: 'number' },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      row: { type: 'number' },
                      field: { type: 'string' },
                      error: { type: 'string' },
                      value: { type: 'string' },
                    },
                  },
                },
              },
            },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            estimatedCompletion: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getJobStatus(@Param('jobId') jobId: string, @Request() req: any) {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School ID not found in user context');
    }

    const result = await this.bulkUploadService.getJobStatus(jobId, schoolId);

    return {
      success: true,
      data: result,
    };
  }

  @Get('errors/:jobId')
  @ApiOperation({
    summary: 'Download error report for bulk import job',
    description: 'Downloads a CSV file containing detailed error information for failed records',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV error report file download',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job not found',
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async downloadErrorReport(
    @Param('jobId') jobId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School ID not found in user context');
    }

    const errors = await this.bulkUploadService.getJobErrors(jobId, schoolId);

    // Create CSV content for error report
    const headers = ['Row Number', 'Field Name', 'Error Message', 'Field Value'];
    let csvContent = headers.join(',') + '\n';

    errors.forEach((error) => {
      const row = [
        error.row || '',
        error.field || '',
        `"${error.error || ''}"`,
        `"${error.value || ''}"`,
      ];
      csvContent += row.join(',') + '\n';
    });

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bulk-import-errors-${jobId}.csv"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent));

    res.send(csvContent);
  }

  @Get('jobs')
  @ApiOperation({
    summary: 'Get bulk import job history',
    description: 'Returns a list of bulk import jobs for the current school',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of bulk import jobs',
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getJobHistory(@Request() req: any) {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School ID not found in user context');
    }

    // This would be implemented in the service
    // For now, return a placeholder response
    return {
      success: true,
      data: {
        jobs: [],
        message: 'Job history feature coming soon',
      },
    };
  }
}
