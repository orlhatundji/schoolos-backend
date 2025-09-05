import { StudentRecordDto } from '../dto';

export interface BulkUploadJobData {
  jobId: string;
  schoolId: string;
  userId: string;
  fileName: string;
  records: StudentRecordDto[];
  options: {
    skipDuplicates: boolean;
    updateExisting: boolean;
    batchSize: number;
    sendNotifications: boolean;
  };
}

export interface BulkUploadProgress {
  totalRecords: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
  errors: BulkUploadError[];
}

export interface BulkUploadError {
  row: number;
  field?: string;
  error: string;
  value?: string;
  suggestion?: string;
}

export interface BulkUploadResult {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: BulkUploadProgress;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  recordCount: number;
}

export interface ParsedFileResult {
  records: StudentRecordDto[];
  errors: BulkUploadError[];
}

export interface BulkImportJob {
  id: string;
  schoolId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  options: any;
  errors: BulkUploadError[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentCreationResult {
  success: boolean;
  student?: any;
  error?: string;
  record?: StudentRecordDto;
}
