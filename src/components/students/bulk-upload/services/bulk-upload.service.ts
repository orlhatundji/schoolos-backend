import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

import { BaseService } from '../../../../common/base-service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BulkImportStatus } from '@prisma/client';
import { BulkUploadOptionsDto, StudentRecordDto } from '../dto';
import {
  BulkUploadJobData,
  BulkUploadResult,
  FileValidationResult,
  ParsedFileResult,
} from '../types';

@Injectable()
export class BulkUploadService extends BaseService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('student-import') private readonly studentImportQueue: Queue,
  ) {
    super(BulkUploadService.name);
  }

  async uploadFile(
    file: Express.Multer.File,
    options: BulkUploadOptionsDto,
    schoolId: string,
    userId: string,
  ): Promise<BulkUploadResult> {
    try {
      // 1. Validate file
      const fileValidation = await this.validateFile(file);
      if (!fileValidation.isValid) {
        throw new BadRequestException(
          `File validation failed: ${fileValidation.errors.join(', ')}`,
        );
      }

      // 2. Parse file content
      const parseResult = await this.parseFile(file);
      if (parseResult.errors.length > 0) {
        const errorSummary = this.createDetailedErrorSummary(parseResult.errors);
        throw new BadRequestException(errorSummary);
      }

      // 3. Create job record
      const jobId = this.generateJobId();
      const job = await this.createJobRecord(
        jobId,
        schoolId,
        userId,
        file,
        parseResult.records.length,
        options,
      );

      // 4. Queue processing job
      await this.queueProcessingJob(
        jobId,
        schoolId,
        userId,
        file.originalname,
        parseResult.records,
        options,
      );

      return {
        jobId,
        status: 'PENDING',
        progress: {
          totalRecords: parseResult.records.length,
          processed: 0,
          successful: 0,
          failed: 0,
          percentage: 0,
          errors: [],
        },
        startedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error in uploadFile:', error);
      throw error;
    }
  }

  async getJobStatus(jobId: string, schoolId: string): Promise<BulkUploadResult> {
    const job = await this.prisma.bulkImportJob.findFirst({
      where: { id: jobId, schoolId },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    const percentage =
      job.totalRecords > 0 ? Math.round((job.processedRecords / job.totalRecords) * 100) : 0;

    return {
      jobId: job.id,
      status: job.status as any,
      progress: {
        totalRecords: job.totalRecords,
        processed: job.processedRecords,
        successful: job.successfulRecords,
        failed: job.failedRecords,
        percentage,
        errors: job.errors as any[],
      },
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      estimatedCompletion: this.calculateEstimatedCompletion(job),
    };
  }

  async getJobErrors(jobId: string, schoolId: string): Promise<any[]> {
    const job = await this.prisma.bulkImportJob.findFirst({
      where: { id: jobId, schoolId },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    return job.errors as any[];
  }

  private async validateFile(file: Express.Multer.File): Promise<FileValidationResult> {
    const errors: string[] = [];

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push(
        `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (10MB)`,
      );
    }

    // Check file type
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed types: CSV, XLS, XLSX`);
    }

    // Check file extension
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      recordCount: 0, // Will be updated after parsing
    };
  }

  private async parseFile(file: Express.Multer.File): Promise<ParsedFileResult> {
    const records: StudentRecordDto[] = [];
    const errors: any[] = [];

    try {
      if (file.mimetype === 'text/csv') {
        return await this.parseCsvFile(file, records, errors);
      } else {
        return await this.parseExcelFile(file, records, errors);
      }
    } catch (error) {
      this.logger.error('Error parsing file:', error);
      errors.push({
        row: 0,
        error: `File parsing failed: ${error.message}`,
      });
      return { records, errors };
    }
  }

  private async parseCsvFile(
    file: Express.Multer.File,
    records: StudentRecordDto[],
    errors: any[],
  ): Promise<ParsedFileResult> {
    return new Promise((resolve, reject) => {
      const stream = Readable.from(file.buffer);
      let rowNumber = 0;

      stream
        .pipe(csv())
        .on('data', (row) => {
          rowNumber++;

          // Skip empty rows (rows where all fields are empty or undefined)
          const isEmptyRow =
            !row ||
            Object.values(row).every(
              (value) => value === undefined || value === null || value === '',
            );
          if (isEmptyRow) {
            return;
          }

          try {
            const record = this.transformCsvRowToStudentRecord(row, rowNumber);
            if (record) {
              records.push(record);
            }
          } catch (error) {
            errors.push({
              row: rowNumber,
              error: `Row parsing failed: ${error.message}`,
              value: JSON.stringify(row),
            });
          }
        })
        .on('end', () => {
          resolve({ records, errors });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  private async parseExcelFile(
    file: Express.Multer.File,
    records: StudentRecordDto[],
    errors: any[],
  ): Promise<ParsedFileResult> {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header row
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];

        // Skip empty rows (rows where all cells are empty or undefined)
        const isEmptyRow =
          !row || row.every((cell) => cell === undefined || cell === null || cell === '');
        if (isEmptyRow) {
          continue;
        }

        try {
          const record = this.transformExcelRowToStudentRecord(row, i + 1);
          if (record) {
            records.push(record);
          }
        } catch (error) {
          errors.push({
            row: i + 1,
            error: `Row parsing failed: ${error.message}`,
            value: JSON.stringify(row),
          });
        }
      }

      return { records, errors };
    } catch (error) {
      errors.push({
        row: 0,
        error: `Excel file parsing failed: ${error.message}`,
      });
      return { records, errors };
    }
  }

  private transformCsvRowToStudentRecord(row: any, rowNumber: number): StudentRecordDto | null {
    // Map CSV columns to StudentRecordDto
    // Support both className (new) and classArmId (legacy) for backward compatibility
    const className = row.className || row['Class Name'] || row['class_name'];
    const classArmId = row.classArmId || row['Class Arm ID'] || row['class_arm_id'];

    const record: StudentRecordDto = {
      firstName: row.firstName || row['First Name'] || row['first_name'],
      lastName: row.lastName || row['Last Name'] || row['last_name'],
      gender: (row.gender || row['Gender'] || row['GENDER'])?.toUpperCase(),
      classArmId: classArmId || 'PLACEHOLDER', // Will be replaced with mapped ID if className is provided
      className: className, // Store className for mapping
      dateOfBirth: row.dateOfBirth || row['Date of Birth'] || row['date_of_birth'],
      email: row.email || row['Email'] || row['EMAIL'],
      phone: (row.phone || row['Phone'] || row['PHONE'])?.toString(),
      admissionDate: row.admissionDate || row['Admission Date'] || row['admission_date'],
      guardianFirstName:
        row.guardianFirstName || row['Guardian First Name'] || row['guardian_first_name'],
      guardianLastName:
        row.guardianLastName || row['Guardian Last Name'] || row['guardian_last_name'],
      guardianEmail: row.guardianEmail || row['Guardian Email'] || row['guardian_email'],
      guardianPhone: (
        row.guardianPhone ||
        row['Guardian Phone'] ||
        row['guardian_phone']
      )?.toString(),
      guardianRelationship:
        row.guardianRelationship || row['Guardian Relationship'] || row['guardian_relationship'],
    };

    // Validate required fields with detailed error messages
    const missingFields: string[] = [];
    if (!record.firstName) missingFields.push('firstName');
    if (!record.lastName) missingFields.push('lastName');
    if (!record.gender) missingFields.push('gender');
    if ((!record.classArmId || record.classArmId === 'PLACEHOLDER') && !record.className)
      missingFields.push('className or classArmId');

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate gender value
    if (record.gender && !['MALE', 'FEMALE'].includes(record.gender)) {
      throw new Error(`Invalid gender value: ${record.gender}. Must be MALE or FEMALE`);
    }

    // Validate email format if provided
    if (record.email && !this.isValidEmail(record.email)) {
      throw new Error(`Invalid email format: ${record.email}`);
    }

    // Validate phone format if provided
    if (record.phone && !this.isValidPhone(record.phone)) {
      throw new Error(`Invalid phone format: ${record.phone}`);
    }

    // Validate date format if provided
    if (record.dateOfBirth && !this.isValidDate(record.dateOfBirth)) {
      throw new Error(`Invalid date format: ${record.dateOfBirth}. Use YYYY-MM-DD format`);
    }

    if (record.admissionDate && !this.isValidDate(record.admissionDate)) {
      throw new Error(
        `Invalid admission date format: ${record.admissionDate}. Use YYYY-MM-DD format`,
      );
    }

    return record;
  }

  private transformExcelRowToStudentRecord(row: any[], rowNumber: number): StudentRecordDto | null {
    // New column order: firstName, lastName, gender, className, dateOfBirth, email, phone, admissionDate, guardianFirstName, guardianLastName, guardianEmail, guardianPhone, guardianRelationship
    const record: StudentRecordDto = {
      firstName: row[0],
      lastName: row[1],
      gender: row[2]?.toString().toUpperCase(),
      className: row[3], // New: className instead of classArmId
      classArmId: 'PLACEHOLDER', // Will be mapped from className
      dateOfBirth: this.convertExcelDate(row[4]),
      email: row[5],
      phone: row[6]?.toString(),
      admissionDate: this.convertExcelDate(row[7]), // Moved up one position (was row[8])
      guardianFirstName: row[8], // Moved up one position (was row[9])
      guardianLastName: row[9], // Moved up one position (was row[10])
      guardianEmail: row[10], // Moved up one position (was row[11])
      guardianPhone: row[11]?.toString(), // Moved up one position (was row[12])
      guardianRelationship: row[12], // Moved up one position (was row[13])
    };

    // Validate required fields with detailed error messages
    const missingFields: string[] = [];
    if (!record.firstName) missingFields.push('firstName');
    if (!record.lastName) missingFields.push('lastName');
    if (!record.gender) missingFields.push('gender');
    if ((!record.classArmId || record.classArmId === 'PLACEHOLDER') && !record.className)
      missingFields.push('className or classArmId');

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate gender value
    if (record.gender && !['MALE', 'FEMALE'].includes(record.gender)) {
      throw new Error(`Invalid gender value: ${record.gender}. Must be MALE or FEMALE`);
    }

    // Validate email format if provided
    if (record.email && !this.isValidEmail(record.email)) {
      throw new Error(`Invalid email format: ${record.email}`);
    }

    // Validate phone format if provided
    if (record.phone && !this.isValidPhone(record.phone)) {
      throw new Error(`Invalid phone format: ${record.phone}`);
    }

    // Validate date format if provided
    if (record.dateOfBirth && !this.isValidDate(record.dateOfBirth)) {
      throw new Error(`Invalid date format: ${record.dateOfBirth}. Use YYYY-MM-DD format`);
    }

    if (record.admissionDate && !this.isValidDate(record.admissionDate)) {
      throw new Error(
        `Invalid admission date format: ${record.admissionDate}. Use YYYY-MM-DD format`,
      );
    }

    return record;
  }

  private async createJobRecord(
    jobId: string,
    schoolId: string,
    userId: string,
    file: Express.Multer.File,
    recordCount: number,
    options: BulkUploadOptionsDto,
  ) {
    const job = await this.prisma.bulkImportJob.create({
      data: {
        id: jobId,
        schoolId,
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        totalRecords: recordCount,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        status: 'PENDING',
        options: JSON.parse(JSON.stringify(options)),
        errors: [],
      },
    });

    return job;
  }

  private async queueProcessingJob(
    jobId: string,
    schoolId: string,
    userId: string,
    fileName: string,
    records: StudentRecordDto[],
    options: BulkUploadOptionsDto,
  ): Promise<void> {
    const jobData: BulkUploadJobData = {
      jobId,
      schoolId,
      userId,
      fileName,
      records,
      options: {
        skipDuplicates: options.skipDuplicates ?? true,
        updateExisting: options.updateExisting ?? false,
        batchSize: options.batchSize ?? 50,
        sendNotifications: options.sendNotifications ?? true,
      },
    };

    await this.studentImportQueue.add('bulk-import', jobData, {
      jobId,
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }

  private generateJobId(): string {
    return `bulk_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateEstimatedCompletion(job: any): Date | undefined {
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      return undefined;
    }

    if (job.processedRecords === 0) {
      return undefined;
    }

    const elapsed = Date.now() - job.startedAt.getTime();
    const rate = job.processedRecords / elapsed; // records per millisecond
    const remaining = job.totalRecords - job.processedRecords;
    const estimatedMs = remaining / rate;

    return new Date(Date.now() + estimatedMs);
  }

  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;

    // Remove all non-digit characters except + at the beginning
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

    // More flexible phone validation:
    // - Must start with + (optional) followed by digits
    // - Must be between 7 and 15 digits total (international standard)
    // - Can start with country code
    const phoneRegex = /^[\+]?[1-9]\d{6,14}$/;

    return phoneRegex.test(cleanPhone);
  }

  private isValidDate(dateString: string): boolean {
    if (!dateString || typeof dateString !== 'string') return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private convertExcelDate(value: any): string | undefined {
    if (!value) return undefined;

    // If it's already a string in YYYY-MM-DD format, return as is
    if (typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(value)) {
        return value;
      }
    }

    // If it's a number (Excel serial date), convert it
    if (typeof value === 'number') {
      // Excel serial date: days since 1900-01-01 (with leap year bug)
      // JavaScript Date: milliseconds since 1970-01-01
      const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
      const jsDate = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);

      // Format as YYYY-MM-DD
      const year = jsDate.getFullYear();
      const month = String(jsDate.getMonth() + 1).padStart(2, '0');
      const day = String(jsDate.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    // If it's a Date object, format it
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    // If it's a string that's not in YYYY-MM-DD format, try to parse it
    if (typeof value === 'string') {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
      }
    }

    return undefined;
  }

  private createDetailedErrorSummary(errors: any[]): string {
    if (errors.length === 0) return '';

    // Group errors by type for better organization
    const errorGroups = {
      missingFields: [] as any[],
      invalidValues: [] as any[],
      formatErrors: [] as any[],
      other: [] as any[],
    };

    errors.forEach((error) => {
      const errorMsg = error.error.toLowerCase();
      if (errorMsg.includes('missing required fields')) {
        errorGroups.missingFields.push(error);
      } else if (errorMsg.includes('invalid') || errorMsg.includes('format')) {
        if (
          errorMsg.includes('email') ||
          errorMsg.includes('phone') ||
          errorMsg.includes('date') ||
          errorMsg.includes('gender')
        ) {
          errorGroups.formatErrors.push(error);
        } else {
          errorGroups.invalidValues.push(error);
        }
      } else {
        errorGroups.other.push(error);
      }
    });

    let summary = `File parsing failed with ${errors.length} error(s). Please fix the following issues:\n\n`;

    // Missing fields section
    if (errorGroups.missingFields.length > 0) {
      summary += `🔴 MISSING REQUIRED FIELDS (${errorGroups.missingFields.length} rows):\n`;
      errorGroups.missingFields.forEach((error) => {
        summary += `   • Row ${error.row}: ${error.error}\n`;
      });
      summary += `   💡 Solution: Ensure all required fields (firstName, lastName, gender, classArmId) are filled in these rows.\n\n`;
    }

    // Format errors section
    if (errorGroups.formatErrors.length > 0) {
      summary += `🔴 FORMAT ERRORS (${errorGroups.formatErrors.length} rows):\n`;
      errorGroups.formatErrors.forEach((error) => {
        summary += `   • Row ${error.row}: ${error.error}\n`;
      });
      summary += `   💡 Solution: Check the format requirements:\n`;
      summary += `      - Gender: Must be "MALE" or "FEMALE"\n`;
      summary += `      - Email: Must be valid email format (e.g., user@example.com)\n`;
      summary += `      - Phone: Must be valid phone number (7-15 digits, e.g., +2348188415181 or 2348188415181)\n`;
      summary += `      - Dates: Must be in YYYY-MM-DD format (e.g., 2023-12-25)\n\n`;
    }

    // Invalid values section
    if (errorGroups.invalidValues.length > 0) {
      summary += `🔴 INVALID VALUES (${errorGroups.invalidValues.length} rows):\n`;
      errorGroups.invalidValues.forEach((error) => {
        summary += `   • Row ${error.row}: ${error.error}\n`;
      });
      summary += `   💡 Solution: Check the values in these rows and ensure they meet the requirements.\n\n`;
    }

    // Other errors section
    if (errorGroups.other.length > 0) {
      summary += `🔴 OTHER ERRORS (${errorGroups.other.length} rows):\n`;
      errorGroups.other.forEach((error) => {
        summary += `   • Row ${error.row}: ${error.error}\n`;
      });
      summary += `\n`;
    }

    // Add helpful tips
    summary += `📋 HELPFUL TIPS:\n`;
    summary += `   • Download the template: GET /api/students/bulk-import/template\n`;
    summary += `   • Check column headers match the template exactly\n`;
    summary += `   • Ensure no empty rows between data\n`;
    summary += `   • Verify classArmId values exist in your school\n`;

    return summary;
  }

  private async mapClassNameToId(className: string, schoolId: string): Promise<string | null> {
    if (!className) return null;

    try {
      // Try to find class by name pattern: "Level Name Class Name" (e.g., "Grade 1 A")
      const classArm = await this.prisma.classArm.findFirst({
        where: {
          schoolId,
          deletedAt: null,
        },
        include: {
          level: true,
        },
      });

      if (!classArm) return null;

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
