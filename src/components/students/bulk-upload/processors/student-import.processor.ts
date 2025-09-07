import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../../prisma/prisma.service';
import { StudentsService } from '../../students.service';
import { BulkUploadJobData, StudentCreationResult } from '../types';

@Processor('student-import')
@Injectable()
export class StudentImportProcessor extends WorkerHost {
  private readonly logger = new Logger(StudentImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
  ) {
    super();
  }

  async process(job: Job<BulkUploadJobData>) {
    const { jobId, schoolId, records, options } = job.data;

    try {
      this.logger.log(`Starting bulk import job ${jobId} with ${records.length} records`);

      // Update job status to processing
      await this.updateJobStatus(jobId, 'PROCESSING');

      // Process records in batches
      const batches = this.createBatches(records, options.batchSize);
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;
      const allErrors: any[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} records`);

        const batchResults = await this.processBatch(batch, schoolId, jobId, options);
        
        totalProcessed += batch.length;
        totalSuccessful += batchResults.filter(r => r.success).length;
        totalFailed += batchResults.filter(r => !r.success).length;
        allErrors.push(...batchResults.filter(r => !r.success).map(r => ({
          row: records.indexOf(r.record) + 1,
          error: r.error,
          record: r.record,
        })));

        // Update job progress
        await this.updateJobProgress(jobId, {
          processedRecords: totalProcessed,
          successfulRecords: totalSuccessful,
          failedRecords: totalFailed,
          errors: allErrors,
        });

        // Update job progress for BullMQ
        await job.updateProgress({
          processed: totalProcessed,
          total: records.length,
          successful: totalSuccessful,
          failed: totalFailed,
          percentage: Math.round((totalProcessed / records.length) * 100),
        });

        // Small delay between batches to prevent overwhelming the database
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Mark job as completed
      await this.updateJobStatus(jobId, 'COMPLETED', {
        processedRecords: totalProcessed,
        successfulRecords: totalSuccessful,
        failedRecords: totalFailed,
        errors: allErrors,
      });

      this.logger.log(`Completed bulk import job ${jobId}: ${totalSuccessful} successful, ${totalFailed} failed`);

      return {
        jobId,
        totalProcessed,
        totalSuccessful,
        totalFailed,
        errors: allErrors,
      };
    } catch (error) {
      this.logger.error(`Error in bulk import job ${jobId}:`, error);
      
      // Mark job as failed
      await this.updateJobStatus(jobId, 'FAILED', {
        errors: [{ error: error.message, details: error.stack }],
      });

      throw error;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    batch: any[],
    schoolId: string,
    jobId: string,
    options: BulkUploadJobData['options'],
  ): Promise<StudentCreationResult[]> {
    const results: StudentCreationResult[] = [];

    for (const record of batch) {
      try {
        // Validate record before processing
        const validationError = await this.validateRecord(record, schoolId);
        if (validationError) {
          results.push({
            success: false,
            error: validationError,
            record,
          });
          continue;
        }

        // Check for duplicates if skipDuplicates is enabled
        if (options.skipDuplicates) {
          const isDuplicate = await this.checkForDuplicates(record, schoolId);
          if (isDuplicate) {
            results.push({
              success: false,
              error: 'Duplicate record found (email or admission number already exists)',
              record,
            });
            continue;
          }
        }

        // Map className to classArmId if needed
        if (record.className && (!record.classArmId || record.classArmId === 'PLACEHOLDER')) {
          const classArmId = await this.mapClassNameToId(record.className, schoolId);
          if (!classArmId) {
            results.push({
              success: false,
              error: `Invalid class name: "${record.className}". Please check available classes in the template.`,
              record,
            });
            continue;
          }
          record.classArmId = classArmId;
        }

        // Transform record to match CreateStudentDto structure
        const createStudentDto = this.transformRecordToCreateStudentDto(record);
        
        // Create student
        const student = await this.studentsService.create(createStudentDto, schoolId);
        
        results.push({
          success: true,
          student,
          record,
        });
      } catch (error) {
        this.logger.error(`Error creating student for record:`, error);
        results.push({
          success: false,
          error: error.message,
          record,
        });
      }
    }

    return results;
  }

  private async validateRecord(record: any, schoolId: string): Promise<string | null> {
    try {
      // Check if classArmId exists and belongs to the school
      // Skip validation if classArmId is PLACEHOLDER and we have className to map
      if (!(record.classArmId === 'PLACEHOLDER' && record.className)) {
        const classArm = await this.prisma.classArm.findFirst({
          where: {
            id: record.classArmId,
            schoolId,
            deletedAt: null,
          },
        });

        if (!classArm) {
          return `Invalid classArmId: ${record.classArmId} not found for this school`;
        }
      }

      // Validate email format if provided
      if (record.email && !this.isValidEmail(record.email)) {
        return `Invalid email format: ${record.email}`;
      }

      // Validate date formats if provided
      if (record.dateOfBirth && !this.isValidDate(record.dateOfBirth)) {
        return `Invalid dateOfBirth format: ${record.dateOfBirth}. Expected YYYY-MM-DD`;
      }

      if (record.admissionDate && !this.isValidDate(record.admissionDate)) {
        return `Invalid admissionDate format: ${record.admissionDate}. Expected YYYY-MM-DD`;
      }

      // Validate gender
      if (!['MALE', 'FEMALE'].includes(record.gender)) {
        return `Invalid gender: ${record.gender}. Must be MALE or FEMALE`;
      }

      return null;
    } catch (error) {
      return `Validation error: ${error.message}`;
    }
  }

  private async checkForDuplicates(record: any, schoolId: string): Promise<boolean> {
    try {
      // Check for duplicate email
      if (record.email) {
        const existingByEmail = await this.prisma.user.findFirst({
          where: {
            email: record.email,
            schoolId,
            deletedAt: null,
          },
        });

        if (existingByEmail) {
          return true;
        }
      }

      // Check for duplicate admission number
      if (record.admissionNo) {
        const existingByAdmissionNo = await this.prisma.student.findFirst({
          where: {
            admissionNo: record.admissionNo,
            user: {
              schoolId,
            },
            deletedAt: null,
          },
        });

        if (existingByAdmissionNo) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking for duplicates:', error);
      return false;
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    additionalData?: any,
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'PROCESSING' && !additionalData) {
        updateData.startedAt = new Date();
      }

      if (status === 'COMPLETED' || status === 'FAILED') {
        updateData.completedAt = new Date();
      }

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(`Error updating job status for ${jobId}:`, error);
    }
  }

  private async updateJobProgress(jobId: string, progressData: any): Promise<void> {
    try {
      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          ...progressData,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating job progress for ${jobId}:`, error);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }

  private transformRecordToCreateStudentDto(record: any): any {
    // Extract guardian fields and className (used only for mapping) and group them into guardianInformation
    const {
      guardianFirstName,
      guardianLastName,
      guardianEmail,
      guardianPhone,
      guardianRelationship,
      className, // Remove className as it's only used for mapping, not for user creation
      ...studentFields
    } = record;

    // Build guardianInformation object if any guardian fields are provided
    let guardianInformation = undefined;
    if (guardianFirstName || guardianLastName || guardianEmail || guardianPhone || guardianRelationship) {
      guardianInformation = {
        firstName: guardianFirstName,
        lastName: guardianLastName,
        email: guardianEmail,
        phone: guardianPhone,
        relationship: guardianRelationship,
      };
      
      // Remove undefined values
      Object.keys(guardianInformation).forEach(key => {
        if (guardianInformation[key] === undefined) {
          delete guardianInformation[key];
        }
      });
    }

    // Convert admissionDate string to Date object if provided
    let admissionDate = undefined;
    if (studentFields.admissionDate) {
      admissionDate = new Date(studentFields.admissionDate);
    }

    return {
      ...studentFields,
      guardianInformation,
      admissionDate,
    };
  }

  private async mapClassNameToId(className: string, schoolId: string): Promise<string | null> {
    if (!className) return null;
    
    try {
      // Find all class arms for this school to search through
      const classArms = await this.prisma.classArm.findMany({
        where: {
          schoolId,
          deletedAt: null,
        },
        include: {
          level: true,
        },
      });

      // Look for exact match with format "Level Name Class Name"
      const matchingClass = classArms.find(ca => {
        const fullName = `${ca.level.name} ${ca.name}`;
        return fullName.toLowerCase() === className.toLowerCase();
      });

      return matchingClass?.id || null;
    } catch (error) {
      this.logger.error(`Error mapping class name "${className}" to ID:`, error);
      return null;
    }
  }
}
