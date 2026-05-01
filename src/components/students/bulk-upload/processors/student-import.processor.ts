import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../../prisma/prisma.service';
import { StudentsService } from '../../students.service';
import { ActivityLogService } from '../../../../common/services/activity-log.service';
import { CurrentTermService } from '../../../../shared/services/current-term.service';
import { BulkUploadJobData } from '../types';

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

      // Prefetch reference data needed by every row, in three queries
      // instead of three-per-row. For a 500-row sheet this drops ~1500
      // sequential DB roundtrips down to a constant cost.
      //
      // 1) Current term/session — also catches the "no term set" failure
      //    once, upfront, with a clear error.
      // 2) All class arms for the school — `byId` powers direct-UUID
      //    lookups (matches the legacy validation which intentionally
      //    didn't restrict by session); `byFullName` is scoped to the
      //    current session for `className` resolution (matches the
      //    legacy mapClassNameToId behavior).
      // 3) Already-imported admission numbers that overlap this sheet —
      //    used for skip-on-duplicate without per-row queries. We only
      //    issue the query when the sheet actually has admission numbers
      //    set, which is the unusual case (admissionNo is auto-generated
      //    when blank).
      const current = await this.currentTermService.getCurrentTermWithSession(schoolId);
      if (!current) {
        return await this.failJobUpfront(jobId, schoolId, records.length, [
          {
            row: 0,
            error:
              'No current term is set for this school. Set a current term in academic settings before importing students.',
            record: null,
          },
        ]);
      }

      const classArms = await this.prisma.classArm.findMany({
        where: { schoolId, deletedAt: null },
        include: { level: true },
      });
      const classArmsById = new Map(classArms.map((c) => [c.id, c]));
      const classArmsByFullName = new Map(
        classArms
          .filter((c) => c.academicSessionId === current.session.id)
          .map((c) => [`${c.level.name} ${c.name}`.toLowerCase(), c]),
      );

      const candidateAdmissionNos = (records as any[])
        .map((r) => r.admissionNo)
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
      const existingAdmissionNoSet = new Set<string>();
      if (candidateAdmissionNos.length > 0) {
        const existing = await this.prisma.student.findMany({
          where: {
            admissionNo: { in: candidateAdmissionNos },
            user: { schoolId },
            deletedAt: null,
          },
          select: { admissionNo: true },
        });
        for (const s of existing) {
          if (s.admissionNo) existingAdmissionNoSet.add(s.admissionNo);
        }
      }

      // Pre-validation pass. Bulk imports are all-or-nothing on validation:
      // a single bad row aborts the whole job without creating any students,
      // so the school fixes the sheet and re-uploads everything in one go
      // rather than tracking down failed rows across multiple uploads.
      // Within-sheet admissionNo duplicates are caught here too, with a row
      // reference to the first occurrence — a friendlier error than the raw
      // unique-constraint exception we'd otherwise see mid-tx.
      const preValidationErrors: any[] = [];
      const seenAdmissionNos = new Map<string, number>();
      for (let i = 0; i < records.length; i++) {
        const record = records[i] as any;
        const rowNumber = i + 1;

        const formatError = this.validateRecordFormat(record);
        if (formatError) {
          preValidationErrors.push({ row: rowNumber, error: formatError, record });
          continue;
        }

        const armResult = this.resolveClassArmFromMaps(
          record,
          classArmsById,
          classArmsByFullName,
        );
        if ('error' in armResult) {
          preValidationErrors.push({ row: rowNumber, error: armResult.error, record });
          continue;
        }
        record.classArmId = armResult.classArmId;

        if (record.admissionNo) {
          const seenAt = seenAdmissionNos.get(record.admissionNo);
          if (seenAt !== undefined) {
            preValidationErrors.push({
              row: rowNumber,
              error: `Duplicate admissionNo "${record.admissionNo}" — already used on row ${seenAt}.`,
              record,
            });
            continue;
          }
          seenAdmissionNos.set(record.admissionNo, rowNumber);
        }
      }

      if (preValidationErrors.length > 0) {
        return await this.failJobUpfront(jobId, schoolId, records.length, preValidationErrors);
      }

      // Pre-filter rows whose admissionNo already exists in the DB. With
      // skipDuplicates set (the only setting the UI exposes today) we drop
      // those rows silently so a partial re-upload still imports the new
      // rows. With it unset we keep the row in the queue and let the unique
      // constraint surface — which under all-or-nothing semantics aborts
      // the whole tx.
      const recordsToCreate: any[] = [];
      let skippedDuplicates = 0;
      for (const record of records as any[]) {
        if (
          options.skipDuplicates &&
          record.admissionNo &&
          existingAdmissionNoSet.has(record.admissionNo)
        ) {
          skippedDuplicates++;
        } else {
          recordsToCreate.push(record);
        }
      }

      // Single transaction across the entire import. Any row that fails
      // the create (FK violation, unique-constraint hit, etc.) bubbles up
      // and rolls back every prior row in the same job — there are no
      // partial commits. The trade-off is no granular progress reporting
      // during the write phase: status flips PROCESSING → COMPLETED|FAILED.
      // For typical sheets (<1000 rows) the tx finishes in seconds; the
      // 5-minute timeout covers the documented 5000-row max.
      let totalSuccessful = 0;
      let failedRow: { row: number; error: string; record: any } | null = null;
      const postCommitTasks: Array<() => Promise<void>> = [];

      try {
        await this.prisma.$transaction(
          async (tx) => {
            for (let i = 0; i < recordsToCreate.length; i++) {
              const record = recordsToCreate[i];
              const rowNumber = records.indexOf(record) + 1;
              try {
                const createStudentDto = this.transformRecordToCreateStudentDto(record);
                await this.studentsService.create(createStudentDto, schoolId, {
                  tx,
                  postCommitTasks,
                });
                totalSuccessful++;
              } catch (error) {
                // Log the raw error server-side; the persisted message is
                // sanitized so internal SQL/operation prose never reaches
                // the admin UI.
                this.logger.error(`Bulk import row ${rowNumber} failed:`, error);
                failedRow = {
                  row: rowNumber,
                  error: this.friendlyImportError(error, jobId),
                  record,
                };
                throw error; // abort the tx — every prior insert in this job rolls back
              }
            }
          },
          {
            timeout: 300000, // 5 minutes
            maxWait: 10000,
          },
        );
      } catch (txError) {
        const errorEntry = failedRow ?? {
          row: 0,
          error: this.friendlyImportError(txError, jobId),
          record: null,
        };
        await this.updateJobStatus(jobId, 'FAILED', {
          processedRecords: recordsToCreate.length,
          successfulRecords: 0, // tx rolled back — nothing committed
          failedRecords: 1,
          errors: [errorEntry],
        });
        this.logger.warn(
          `Bulk import job ${jobId} rolled back: row ${errorEntry.row} failed (${errorEntry.error}). All prior inserts in this job were reverted.`,
        );
        await this.logBulkImportFailure(jobId, schoolId, [errorEntry], {
          totalProcessed: recordsToCreate.length,
          totalFailed: 1,
        });
        return {
          jobId,
          totalProcessed: recordsToCreate.length,
          totalSuccessful: 0,
          totalFailed: 1,
          errors: [errorEntry],
        };
      }

      // Tx committed successfully — fire the deferred side-effects (welcome
      // emails, etc.). These are best-effort and intentionally don't block
      // job completion.
      for (const task of postCommitTasks) {
        try {
          await task();
        } catch (err) {
          this.logger.error('Post-commit task failed:', err);
        }
      }

      await this.updateJobStatus(jobId, 'COMPLETED', {
        processedRecords: recordsToCreate.length,
        successfulRecords: totalSuccessful,
        failedRecords: 0,
        errors: [],
      });
      await job.updateProgress({
        processed: recordsToCreate.length,
        total: records.length,
        successful: totalSuccessful,
        failed: 0,
        percentage: 100,
      });

      this.logger.log(
        `Completed bulk import job ${jobId}: ${totalSuccessful} student(s) imported${
          skippedDuplicates > 0 ? `, ${skippedDuplicates} duplicate(s) skipped` : ''
        }`,
      );

      // Log the completion activity
      try {
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
              totalProcessed: recordsToCreate.length,
              totalSuccessful,
              totalFailed: 0,
              skippedDuplicates,
            },
            description: `Completed bulk import: ${totalSuccessful} students imported successfully${
              skippedDuplicates > 0 ? ` (${skippedDuplicates} duplicate row(s) skipped)` : ''
            }`,
            category: 'STUDENT_MANAGEMENT',
            severity: 'INFO',
          });
        }
      } catch (logError) {
        this.logger.error('Failed to log bulk import completion activity:', logError);
      }

      return {
        jobId,
        totalProcessed: recordsToCreate.length,
        totalSuccessful,
        totalFailed: 0,
        errors: [],
      };
    } catch (error) {
      // Full error stays in server logs; the user-facing description is sanitized.
      this.logger.error(`Error in bulk import job ${jobId}:`, error);
      const friendly = this.friendlyImportError(error, jobId);
      const stack = error instanceof Error ? error.stack : undefined;

      // Mark job as failed
      await this.updateJobStatus(jobId, 'FAILED', {
        errors: [{ error: friendly, details: stack }],
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
              error: friendly,
              errorStack: stack,
            },
            description: `Bulk import failed: ${friendly}`,
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

  /**
   * Translate raw errors thrown during a bulk import into a message safe
   * to expose in the admin UI. Prisma errors carry SQL text and operation
   * trees in their `.message` — those must never reach the user. We map
   * known Prisma error codes to short, human descriptions and fall back
   * to a generic "contact support" line that includes the job id so a
   * support engineer can grep the logs.
   *
   * Errors thrown by our own code (NestJS exceptions, hand-written Error
   * messages) are passed through — we trust those messages.
   */
  private friendlyImportError(error: unknown, jobId: string): string {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String((error as { code: unknown }).code);
      switch (code) {
        case 'P2002':
          return 'A row in your sheet conflicts with an existing student (duplicate value).';
        case 'P2003':
          return 'A referenced record (class, school, or session) was not found.';
        case 'P2000':
          return 'A field value is too long for its database column.';
        case 'P2025':
          return 'A required referenced record was not found.';
        default:
          if (code.startsWith('P')) {
            return `Import failed due to a database error. Please contact support and reference job ${jobId}.`;
          }
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return `Import failed due to an unexpected error. Please contact support and reference job ${jobId}.`;
  }

  /**
   * Pure format-only validation. No DB calls — all DB-dependent checks
   * (classArm existence, admissionNo uniqueness) are handled by the
   * prefetched maps in `process()`.
   */
  private validateRecordFormat(record: any): string | null {
    if (record.email && !this.isValidEmail(record.email)) {
      return `Invalid email format: ${record.email}`;
    }
    if (record.dateOfBirth && !this.isValidDate(record.dateOfBirth)) {
      return `Invalid dateOfBirth format: ${record.dateOfBirth}. Expected DD-MM-YYYY or YYYY-MM-DD`;
    }
    if (record.admissionDate && !this.isValidDate(record.admissionDate)) {
      return `Invalid admissionDate format: ${record.admissionDate}. Expected DD-MM-YYYY or YYYY-MM-DD`;
    }
    if (!['MALE', 'FEMALE'].includes(record.gender)) {
      return `Invalid gender: ${record.gender}. Must be MALE or FEMALE`;
    }
    return null;
  }

  /**
   * Resolve a record's class arm against the prefetched maps. Two paths:
   *   - className provided (typical) → look up in the current-session
   *     `byFullName` map.
   *   - direct classArmId → look up in the school-wide `byId` map (any
   *     session, matching legacy behavior).
   */
  private resolveClassArmFromMaps(
    record: any,
    byId: Map<string, { id: string }>,
    byFullName: Map<string, { id: string }>,
  ): { classArmId: string } | { error: string } {
    if (record.className && (!record.classArmId || record.classArmId === 'PLACEHOLDER')) {
      const found = byFullName.get(String(record.className).toLowerCase());
      if (!found) {
        return {
          error: `Invalid class name: "${record.className}". Please check available classes in the template.`,
        };
      }
      return { classArmId: found.id };
    }
    if (record.classArmId && byId.has(record.classArmId)) {
      return { classArmId: record.classArmId };
    }
    return {
      error: `Invalid classArmId: ${record.classArmId} not found for this school`,
    };
  }

  /**
   * Mark the job FAILED before the write phase, log the failure activity,
   * and produce the worker return value. Used for any precondition error
   * (no current term, validation errors) — keeps the early-return paths
   * from drifting apart.
   */
  private async failJobUpfront(
    jobId: string,
    schoolId: string,
    totalRecords: number,
    errors: any[],
  ) {
    await this.updateJobStatus(jobId, 'FAILED', {
      processedRecords: totalRecords,
      successfulRecords: 0,
      failedRecords: errors.length,
      errors,
    });
    this.logger.warn(
      `Bulk import job ${jobId} aborted before write phase: ${errors.length} row(s) failed validation`,
    );
    await this.logBulkImportFailure(jobId, schoolId, errors, {
      totalProcessed: totalRecords,
      totalFailed: errors.length,
    });
    return {
      jobId,
      totalProcessed: totalRecords,
      totalSuccessful: 0,
      totalFailed: errors.length,
      errors,
    };
  }

  /**
   * Logs a BULK_IMPORT_FAILED activity entry. Centralizes the user-lookup +
   * activity-log pattern used both for pre-validation aborts and write-phase
   * failures, so the two paths stay in sync. Best-effort — swallows errors
   * since the import status itself has already been persisted.
   *
   * No partially-imported case: under all-or-nothing semantics either the
   * pre-validation phase fails before any writes or the write tx rolls
   * back every row. Either way, no students were imported.
   */
  private async logBulkImportFailure(
    jobId: string,
    schoolId: string,
    errors: any[],
    counts: { totalProcessed: number; totalFailed: number },
  ): Promise<void> {
    try {
      const jobData = await this.prisma.bulkImportJob.findUnique({
        where: { id: jobId },
        select: { userId: true },
      });
      if (!jobData?.userId) return;

      await this.activityLogService.logActivity({
        userId: jobData.userId,
        schoolId,
        action: 'BULK_IMPORT_FAILED',
        entityType: 'STUDENT',
        entityId: jobId,
        details: {
          jobId,
          totalProcessed: counts.totalProcessed,
          totalFailed: counts.totalFailed,
          errorCount: errors.length,
        },
        description: `Bulk import failed: ${counts.totalFailed} row(s) had errors. No students were imported.`,
        category: 'STUDENT_MANAGEMENT',
        severity: 'ERROR',
      });
    } catch (logError) {
      this.logger.error('Failed to log bulk import failure activity:', logError);
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
    // Extract guardian fields, address fields, medical fields, and className (used only for mapping)
    // so they don't leak into the User create call. Only fields on the User model should remain in studentFields.
    const {
      guardianFirstName,
      guardianLastName,
      guardianEmail,
      guardianPhone,
      guardianRelationship,
      className: _className,
      addressStreet1,
      addressStreet2,
      addressCity,
      addressState,
      addressCountry,
      addressPostalCode,
      bloodGroup,
      allergies,
      medicalConditions,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
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

    // Build address object if any address fields are provided
    let address = undefined;
    if (
      addressStreet1 ||
      addressStreet2 ||
      addressCity ||
      addressState ||
      addressCountry ||
      addressPostalCode
    ) {
      address = {
        street1: addressStreet1,
        street2: addressStreet2,
        city: addressCity,
        state: addressState,
        country: addressCountry,
        postalCode: addressPostalCode,
      };
      Object.keys(address).forEach((key) => {
        if (address[key] === undefined || address[key] === '') {
          delete address[key];
        }
      });
    }

    // Build medicalInformation object if any medical fields are provided
    const splitList = (value: unknown): string[] | undefined => {
      if (typeof value !== 'string') return undefined;
      const parts = value
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return parts.length > 0 ? parts : undefined;
    };

    const allergiesList = splitList(allergies);
    const medicalConditionsList = splitList(medicalConditions);
    let emergencyContact: any = undefined;
    if (emergencyContactName || emergencyContactPhone) {
      emergencyContact = {
        name: emergencyContactName,
        phone: emergencyContactPhone,
        relationship: emergencyContactRelationship,
      };
      Object.keys(emergencyContact).forEach((key) => {
        if (emergencyContact[key] === undefined || emergencyContact[key] === '') {
          delete emergencyContact[key];
        }
      });
    }

    let medicalInformation: any = undefined;
    if (bloodGroup || allergiesList || medicalConditionsList || emergencyContact) {
      medicalInformation = {
        bloodGroup: bloodGroup || undefined,
        allergies: allergiesList,
        medicalConditions: medicalConditionsList,
        emergencyContact,
      };
      Object.keys(medicalInformation).forEach((key) => {
        if (medicalInformation[key] === undefined) {
          delete medicalInformation[key];
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
      address,
      medicalInformation,
    };
  }

}
