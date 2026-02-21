import { Injectable } from '@nestjs/common';
import { ExcelBulkUploadService } from './services/excel-bulk-upload.service';
import { GenerateTemplateDto } from './dto/generate-template.dto';
import { BulkUploadResultDto } from './dto/bulk-upload-result.dto';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly excelBulkUploadService: ExcelBulkUploadService,
  ) {}

  /**
   * Generate Excel template for bulk assessment score upload
   */
  async generateTemplate(
    schoolId: string,
    teacherId: string,
    generateTemplateDto: GenerateTemplateDto,
  ): Promise<Buffer> {
    return this.excelBulkUploadService.generateTemplate(
      schoolId,
      generateTemplateDto.subjectName,
      generateTemplateDto.termName,
      generateTemplateDto.sessionName,
      generateTemplateDto.levelName,
      generateTemplateDto.classArmName,
      teacherId,
    );
  }

  /**
   * Process uploaded Excel file for bulk assessment score upload
   */
  async processBulkUpload(
    fileBuffer: Buffer,
    schoolId: string,
    teacherId: string,
    termId?: string,
  ): Promise<BulkUploadResultDto> {
    return this.excelBulkUploadService.processUpload(fileBuffer, schoolId, teacherId, termId);
  }
}
