import { ApiProperty } from '@nestjs/swagger';
import {
  ClassArm,
  ClassArmSubject,
  Level,
  Quiz,
  QuizAssignment,
  QuizAssignmentStatus,
  QuizAttempt,
  QuizAttemptOverride,
  QuizAttemptStatus,
  QuizDeliveryMode,
  QuizOverrideType,
  Student,
  Subject,
  Teacher,
  Term,
  User,
} from '@prisma/client';

export type AssignmentWithRelations = QuizAssignment & {
  quiz: Pick<Quiz, 'id' | 'title' | 'version' | 'status' | 'estimatedMinutes'>;
  classArmSubject: ClassArmSubject & {
    classArm: ClassArm & { level: Level };
    subject: Subject;
  };
  term: Pick<Term, 'id' | 'name'>;
  assignedByTeacher: Teacher & {
    user: Pick<User, 'firstName' | 'lastName'>;
  };
  _count?: { attempts: number; overrides: number };
};

export function computeEffectiveStatus(
  assignment: Pick<QuizAssignment, 'status' | 'windowOpensAt' | 'windowClosesAt'>,
  now: Date = new Date(),
): QuizAssignmentStatus {
  if (assignment.status === 'ARCHIVED') return 'ARCHIVED';
  if (now < assignment.windowOpensAt) return 'SCHEDULED';
  if (now < assignment.windowClosesAt) return 'OPEN';
  return 'CLOSED';
}

export class QuizAssignmentResult {
  @ApiProperty() id: string;
  @ApiProperty() quizId: string;
  @ApiProperty() quizVersion: number;
  @ApiProperty() quizTitle: string;
  @ApiProperty() classArmSubjectId: string;
  @ApiProperty() classArmName: string;
  @ApiProperty() subjectName: string;
  @ApiProperty() levelCode: string;
  @ApiProperty() termId: string;
  @ApiProperty() termName: string;
  @ApiProperty() assignedByTeacherId: string;
  @ApiProperty() assignedByName: string;
  @ApiProperty({ enum: ['OPEN_WINDOW', 'SYNC_START'] }) mode: QuizDeliveryMode;
  @ApiProperty() windowOpensAt: Date;
  @ApiProperty() windowClosesAt: Date;
  @ApiProperty() durationMinutes: number;
  @ApiProperty({ required: false, nullable: true }) syncGracePeriodSeconds: number | null;
  @ApiProperty() maxAttempts: number;
  @ApiProperty({ required: false, nullable: true }) showResultsImmediately: boolean | null;
  @ApiProperty({ required: false, nullable: true }) showCorrectAnswers: boolean | null;
  @ApiProperty({ required: false, nullable: true }) resultsReleasedAt: Date | null;
  @ApiProperty({
    enum: ['SCHEDULED', 'OPEN', 'CLOSED', 'ARCHIVED'],
    description: 'Stored status — only ARCHIVED is meaningful (manual cancel)',
  })
  status: QuizAssignmentStatus;
  @ApiProperty({
    enum: ['SCHEDULED', 'OPEN', 'CLOSED', 'ARCHIVED'],
    description: 'Computed from window times + stored status — use this for gating',
  })
  effectiveStatus: QuizAssignmentStatus;
  @ApiProperty() attemptCount: number;
  @ApiProperty() overrideCount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(a: AssignmentWithRelations, now: Date = new Date()) {
    this.id = a.id;
    this.quizId = a.quizId;
    this.quizVersion = a.quizVersion;
    this.quizTitle = a.quiz.title;
    this.classArmSubjectId = a.classArmSubjectId;
    this.classArmName = a.classArmSubject.classArm.name;
    this.subjectName = a.classArmSubject.subject.name;
    this.levelCode = a.classArmSubject.classArm.level.code;
    this.termId = a.termId;
    this.termName = a.term.name;
    this.assignedByTeacherId = a.assignedByTeacherId;
    this.assignedByName = `${a.assignedByTeacher.user.firstName} ${a.assignedByTeacher.user.lastName}`;
    this.mode = a.mode;
    this.windowOpensAt = a.windowOpensAt;
    this.windowClosesAt = a.windowClosesAt;
    this.durationMinutes = a.durationMinutes;
    this.syncGracePeriodSeconds = a.syncGracePeriodSeconds;
    this.maxAttempts = a.maxAttempts;
    this.showResultsImmediately = a.showResultsImmediately;
    this.showCorrectAnswers = a.showCorrectAnswers;
    this.resultsReleasedAt = a.resultsReleasedAt;
    this.status = a.status;
    this.effectiveStatus = computeEffectiveStatus(a, now);
    this.attemptCount = a._count?.attempts ?? 0;
    this.overrideCount = a._count?.overrides ?? 0;
    this.createdAt = a.createdAt;
    this.updatedAt = a.updatedAt;
  }
}

export class QuizAssignmentsListResult {
  @ApiProperty({ type: [QuizAssignmentResult] }) items: QuizAssignmentResult[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  constructor(items: QuizAssignmentResult[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
  }
}

export class CreateQuizAssignmentResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: QuizAssignmentResult }) assignment: QuizAssignmentResult;

  constructor(assignment: QuizAssignmentResult) {
    this.success = true;
    this.message = 'Quiz assignment created successfully';
    this.assignment = assignment;
  }
}

export class UpdateQuizAssignmentResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: QuizAssignmentResult }) assignment: QuizAssignmentResult;

  constructor(assignment: QuizAssignmentResult) {
    this.success = true;
    this.message = 'Quiz assignment updated successfully';
    this.assignment = assignment;
  }
}

export class DeleteQuizAssignmentResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;

  constructor() {
    this.success = true;
    this.message = 'Quiz assignment cancelled successfully';
  }
}

export class ReleaseResultsResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty() resultsReleasedAt: Date;

  constructor(resultsReleasedAt: Date) {
    this.success = true;
    this.message = 'Results released to students';
    this.resultsReleasedAt = resultsReleasedAt;
  }
}

export class GrantOverrideResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty() id: string;
  @ApiProperty() studentId: string;
  @ApiProperty({ enum: ['RETRY', 'EXTEND_WINDOW', 'EXTRA_TIME'] }) type: QuizOverrideType;
  @ApiProperty({ required: false, nullable: true }) extraAttempts: number | null;
  @ApiProperty({ required: false, nullable: true }) extraMinutes: number | null;
  @ApiProperty({ required: false, nullable: true }) newWindowClosesAt: Date | null;
  @ApiProperty() reason: string;
  @ApiProperty() grantedByTeacherId: string;
  @ApiProperty() createdAt: Date;

  constructor(o: QuizAttemptOverride) {
    this.success = true;
    this.message = 'Override granted';
    this.id = o.id;
    this.studentId = o.studentId;
    this.type = o.type;
    this.extraAttempts = o.extraAttempts;
    this.extraMinutes = o.extraMinutes;
    this.newWindowClosesAt = o.newWindowClosesAt;
    this.reason = o.reason;
    this.grantedByTeacherId = o.grantedByTeacherId;
    this.createdAt = o.createdAt;
  }
}

// ---- Monitor (teacher polling view) ----

export type StudentForMonitor = Student & {
  user: Pick<User, 'firstName' | 'lastName'>;
};

export type AttemptForMonitor = Pick<
  QuizAttempt,
  'id' | 'attemptNumber' | 'status' | 'startedAt' | 'submittedAt' | 'percentage'
>;

export class StudentMonitorRowResult {
  @ApiProperty() studentId: string;
  @ApiProperty() studentNo: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ enum: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADING', 'GRADED'] })
  attemptStatus: 'NOT_STARTED' | QuizAttemptStatus;
  @ApiProperty() attemptCount: number;
  @ApiProperty({ required: false, nullable: true }) lastStartedAt: Date | null;
  @ApiProperty({ required: false, nullable: true }) lastSubmittedAt: Date | null;
  @ApiProperty({ required: false, nullable: true, description: 'Decimal as string' })
  latestPercentage: string | null;

  constructor(student: StudentForMonitor, attempts: AttemptForMonitor[]) {
    this.studentId = student.id;
    this.studentNo = student.studentNo;
    this.firstName = student.user.firstName;
    this.lastName = student.user.lastName;
    this.attemptCount = attempts.length;
    if (attempts.length === 0) {
      this.attemptStatus = 'NOT_STARTED';
      this.lastStartedAt = null;
      this.lastSubmittedAt = null;
      this.latestPercentage = null;
    } else {
      const latest = attempts.reduce((best, cur) =>
        cur.attemptNumber > best.attemptNumber ? cur : best,
      );
      this.attemptStatus = latest.status;
      this.lastStartedAt = latest.startedAt;
      this.lastSubmittedAt = latest.submittedAt;
      this.latestPercentage = latest.percentage !== null ? latest.percentage.toString() : null;
    }
  }
}

export class QuizAssignmentMonitorResult {
  @ApiProperty({ type: QuizAssignmentResult }) assignment: QuizAssignmentResult;
  @ApiProperty({ type: [StudentMonitorRowResult] }) students: StudentMonitorRowResult[];
  @ApiProperty({ description: 'Counts by status for the dashboard summary' })
  summary: {
    notStarted: number;
    inProgress: number;
    submitted: number;
    grading: number;
    graded: number;
  };

  constructor(assignment: QuizAssignmentResult, students: StudentMonitorRowResult[]) {
    this.assignment = assignment;
    this.students = students;
    this.summary = {
      notStarted: students.filter((s) => s.attemptStatus === 'NOT_STARTED').length,
      inProgress: students.filter((s) => s.attemptStatus === 'IN_PROGRESS').length,
      submitted: students.filter((s) => s.attemptStatus === 'SUBMITTED').length,
      grading: students.filter((s) => s.attemptStatus === 'GRADING').length,
      graded: students.filter((s) => s.attemptStatus === 'GRADED').length,
    };
  }
}

// ---- Final results listing ----

export class StudentResultRowResult {
  @ApiProperty() studentId: string;
  @ApiProperty() studentNo: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() attemptNumber: number;
  @ApiProperty() submittedAt: Date | null;
  @ApiProperty({ required: false, nullable: true, description: 'Decimal as string' })
  totalScore: string | null;
  @ApiProperty({ description: 'Decimal as string' })
  maxScore: string;
  @ApiProperty({ required: false, nullable: true, description: 'Decimal as string' })
  percentage: string | null;
  @ApiProperty({ enum: ['SUBMITTED', 'GRADING', 'GRADED'] })
  status: QuizAttemptStatus;

  constructor(
    attempt: Pick<
      QuizAttempt,
      'attemptNumber' | 'submittedAt' | 'totalScore' | 'maxScore' | 'percentage' | 'status'
    >,
    student: StudentForMonitor,
  ) {
    this.studentId = student.id;
    this.studentNo = student.studentNo;
    this.firstName = student.user.firstName;
    this.lastName = student.user.lastName;
    this.attemptNumber = attempt.attemptNumber;
    this.submittedAt = attempt.submittedAt;
    this.totalScore = attempt.totalScore !== null ? attempt.totalScore.toString() : null;
    this.maxScore = attempt.maxScore.toString();
    this.percentage = attempt.percentage !== null ? attempt.percentage.toString() : null;
    this.status = attempt.status;
  }
}

export class QuizAssignmentResultsResult {
  @ApiProperty({ type: QuizAssignmentResult }) assignment: QuizAssignmentResult;
  @ApiProperty({ type: [StudentResultRowResult] }) attempts: StudentResultRowResult[];

  constructor(assignment: QuizAssignmentResult, attempts: StudentResultRowResult[]) {
    this.assignment = assignment;
    this.attempts = attempts;
  }
}
