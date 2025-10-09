import { Student, ClassArm, Level, AcademicSession, User } from '@prisma/client';

export interface StudentPromotionWithIncludes {
  id: string;
  studentId: string;
  fromClassArmId: string | null;
  toClassArmId: string;
  fromLevelId: string | null;
  toLevelId: string;
  fromAcademicSessionId: string | null;
  toAcademicSessionId: string;
  promotionType: string;
  promotionDate: Date;
  promotedBy: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  student: Student & {
    user: User;
  };
  fromClassArm: ClassArm | null;
  toClassArm: ClassArm & {
    level: Level;
  };
  fromLevel: Level | null;
  toLevel: Level;
  fromAcademicSession: AcademicSession | null;
  toAcademicSession: AcademicSession;
}

export interface PromotionResult {
  studentId: string;
  success: boolean;
  fromLevel?: string;
  toLevel?: string;
  fromClassArm?: string;
  toClassArm?: string;
  error?: string;
}

export interface PromotionBatchResult {
  batchId: string;
  totalStudents: number;
  successfulPromotions: number;
  failedPromotions: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  results: PromotionResult[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface StudentPromotionPreview {
  studentId: string;
  studentName: string;
  studentNo: string;
  currentLevel: string;
  currentClassArm: string;
  proposedLevel: string;
  proposedClassArm: string;
  promotionType: string;
  canPromote: boolean;
  warnings: string[];
  errors: string[];
}

export interface LevelProgressionWithIncludes {
  id: string;
  schoolId: string;
  fromLevelId: string;
  toLevelId: string;
  isAutomatic: boolean;
  requiresApproval: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  fromLevel: Level;
  toLevel: Level;
}

export interface PromotionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

export interface ClassArmCapacityInfo {
  classArmId: string;
  className: string;
  currentCapacity: number;
  maxCapacity: number;
  availableSlots: number;
  isOverCapacity: boolean;
}

export interface PromotionStatistics {
  totalStudents: number;
  eligibleForPromotion: number;
  requiresManualReview: number;
  cannotPromote: number;
  byLevel: Record<string, number>;
  byClassArm: Record<string, number>;
}
