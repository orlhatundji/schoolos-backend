import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../../prisma/prisma.service';
import { StudentsService } from '../../students.service';
import { ActivityLogService } from '../../../../common/services/activity-log.service';
import { CurrentTermService } from '../../../../shared/services/current-term.service';
import { BulkUploadJobData, StudentCreationResult } from '../types';

@Processor('student-import')
@Injectable()
export class StudentImportProcessor extends WorkerHost {
  private readonly logger = new Logger(StudentImportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly activityLogService: ActivityLogService,
    private readonly currentTermService: CurrentTermService,
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
        totalSuccessful += batchResults.filter((r) => r.success).length;
        totalFailed += batchResults.filter((r) => !r.success).length;
        allErrors.push(
          ...batchResults
            .filter((r) => !r.success)
            .map((r) => ({
              row: records.indexOf(r.record) + 1,
              error: r.error,
              record: r.record,
            })),
        );

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
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Mark job as completed
      await this.updateJobStatus(jobId, 'COMPLETED', {
        processedRecords: totalProcessed,
        successfulRecords: totalSuccessful,
        failedRecords: totalFailed,
        errors: allErrors,
      });

      this.logger.log(
        `Completed bulk import job ${jobId}: ${totalSuccessful} successful, ${totalFailed} failed`,
      );

      // Log the completion activity
      try {
        // Get the user who started the job (if available)
        const jobData = await this.prisma.bulkImportJob.findUnique({
          where: { id: jobId },
          select: { userId: true },
        });

        if (jobData?.userId) {
          await this.activityLogService.logActivity({
            userId: jobData.userId,
            schoolId,
            action: 'BULK_IMPORT_COMPLETED',
            entityType: 'STUDENT',
            entityId: jobId,
            details: {
              jobId,
              totalProcessed,
              totalSuccessful,
              totalFailed,
              successRate: totalProcessed > 0 ? (totalSuccessful / totalProcessed) * 100 : 0,
              errorCount: allErrors.length,
            },
            description: `Completed bulk import: ${totalSuccessful} students imported successfully, ${totalFailed} failed`,
            category: 'STUDENT_MANAGEMENT',
            severity: totalFailed > 0 ? 'WARNING' : 'INFO',
          });
        }
      } catch (logError) {
        this.logger.error('Failed to log bulk import completion activity:', logError);
      }

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

      // Log the failure activity
      try {
        const jobData = await this.prisma.bulkImportJob.findUnique({
          where: { id: jobId },
          select: { userId: true },
        });

        if (jobData?.userId) {
          await this.activityLogService.logActivity({
            userId: jobData.userId,
            schoolId,
            action: 'BULK_IMPORT_FAILED',
            entityType: 'STUDENT',
            entityId: jobId,
            details: {
              jobId,
              error: error.message,
              errorStack: error.stack,
            },
            description: `Bulk import failed: ${error.message}`,
            category: 'STUDENT_MANAGEMENT',
            severity: 'ERROR',
          });
        }
      } catch (logError) {
        this.logger.error('Failed to log bulk import failure activity:', logError);
      }

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
        return `Invalid dateOfBirth format: ${record.dateOfBirth}. Expected DD-MM-YYYY or YYYY-MM-DD`;
      }

      if (record.admissionDate && !this.isValidDate(record.admissionDate)) {
        return `Invalid admissionDate format: ${record.admissionDate}. Expected DD-MM-YYYY or YYYY-MM-DD`;
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
      // Check for duplicate admission number only if explicitly provided
      // (admissionNo is auto-generated by the system, so CSV values are typically empty)
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

      // Note: Email is NOT checked for uniqueness because multiple students
      // (e.g. siblings) may share the same parent/guardian email address.

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
    if (!dateString || typeof dateString !== 'string') return false;

    // Accept YYYY-MM-DD
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoRegex.test(dateString)) {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    }

    // Accept DD-MM-YYYY
    const dmyRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (dmyRegex.test(dateString)) {
      const [day, month, year] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    }

    return false;
  }

  /**
   * Convert a date string (DD-MM-YYYY or YYYY-MM-DD) to a Date object.
   */
  private parseDateString(dateString: string): Date {
    const dmyRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (dmyRegex.test(dateString)) {
      const [day, month, year] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateString);
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
    if (
      guardianFirstName ||
      guardianLastName ||
      guardianEmail ||
      guardianPhone ||
      guardianRelationship
    ) {
      guardianInformation = {
        firstName: guardianFirstName,
        lastName: guardianLastName,
        email: guardianEmail,
        phone: guardianPhone,
        relationship: guardianRelationship,
      };

      // Remove undefined values
      Object.keys(guardianInformation).forEach((key) => {
        if (guardianInformation[key] === undefined) {
          delete guardianInformation[key];
        }
      });
    }

    // Convert date strings to Date objects, handling DD-MM-YYYY format
    let admissionDate = undefined;
    if (studentFields.admissionDate) {
      admissionDate = this.parseDateString(studentFields.admissionDate);
    }

    let dateOfBirth = studentFields.dateOfBirth;
    if (dateOfBirth && typeof dateOfBirth === 'string') {
      dateOfBirth = this.parseDateString(dateOfBirth);
    }

    return {
      ...studentFields,
      dateOfBirth,
      guardianInformation,
      admissionDate,
    };
  }

  private async mapClassNameToId(className: string, schoolId: string): Promise<string | null> {
    if (!className) return null;

    try {
      // Get current academic session
      const current = await this.currentTermService.getCurrentTermWithSession(schoolId);

      if (!current) {
        this.logger.warn('No current academic session found for class name mapping');
        return null;
      }

      // Find class arms for this school and current session only
      const classArms = await this.prisma.classArm.findMany({
        where: {
          schoolId,
          academicSessionId: current.session.id,
          deletedAt: null,
        },
        include: {
          level: true,
        },
      });

      // Look for exact match with format "Level Name Class Name"
      const matchingClass = classArms.find((ca) => {
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
