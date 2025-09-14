import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AssessmentRepository } from './assessments.repository';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentMessages } from './results/messages';
import { ExcelBulkUploadService } from './services/excel-bulk-upload.service';
import { GenerateTemplateDto } from './dto/generate-template.dto';
import { BulkUploadResultDto } from './dto/bulk-upload-result.dto';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly assessmentRepository: AssessmentRepository,
    private readonly excelBulkUploadService: ExcelBulkUploadService,
  ) {}

  async create(createAssessmentDto: CreateAssessmentDto) {
    await this.validateMaxScore(createAssessmentDto.schoolId, createAssessmentDto.maxScore);
    return this.assessmentRepository.create(createAssessmentDto);
  }

  async findAll(schoolId: string) {
    return this.assessmentRepository.findAll({
      where: { schoolId },
    });
  }

  async findOne(id: string) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment) {
      throw new NotFoundException(AssessmentMessages.FAILURE.NOT_FOUND);
    }
    return assessment;
  }

  async update(id: string, updateAssessmentDto: UpdateAssessmentDto) {
    const assessment = await this.findOne(id);
    if (updateAssessmentDto.maxScore) {
      await this.validateMaxScore(assessment.schoolId, updateAssessmentDto.maxScore, id);
    }
    return this.assessmentRepository.update({ id }, updateAssessmentDto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.assessmentRepository.delete({ id });
  }

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
  ): Promise<BulkUploadResultDto> {
    return this.excelBulkUploadService.processUpload(fileBuffer, schoolId, teacherId);
  }

  /**
   * Ensures total maxScore for all assessments combined does not exceed 100
   */
  private async validateMaxScore(
    schoolId: string,
    newScore: number,
    assessmentIdToExclude?: string,
  ) {
    const assessments = await this.assessmentRepository.findAll({
      where: { schoolId },
    });

    const currentTotalScore = assessments.reduce((sum, assessment) => {
      if (assessment.id === assessmentIdToExclude) {
        return sum;
      }
      return sum + assessment.maxScore;
    }, 0);

    if (currentTotalScore + newScore > 100) {
      throw new BadRequestException(AssessmentMessages.FAILURE.MAX_SCORE_EXCEEDED);
    }
  }
}
