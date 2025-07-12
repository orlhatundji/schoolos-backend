import {
  School as PrismaSchool,
  User,
  Level,
  Subject,
  GradingModel,
  AcademicSession,
  Department,
  Counter,
} from '@prisma/client';

export interface School extends PrismaSchool {
  users?: User[];
  levels?: Level[];
  subjects?: Subject[];
  gradingModel?: GradingModel;
  academicSessions?: AcademicSession[];
  departments?: Department[];
  counters?: Counter[];
}
