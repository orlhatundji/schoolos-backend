import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import {
  CreateQuizAssignmentDto,
  GrantOverrideDto,
  UpdateQuizAssignmentDto,
} from './dto';
import {
  CreateQuizAssignmentResult,
  DeleteQuizAssignmentResult,
  GrantOverrideResult,
  QuizAssignmentMonitorResult,
  QuizAssignmentResult,
  QuizAssignmentResultsResult,
  QuizAssignmentsListResult,
  ReleaseResultsResult,
  UpdateQuizAssignmentResult,
} from './results/quiz-assignment.result';

export function CreateQuizAssignmentSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Schedule a published quiz to a class arm subject. Snapshots quiz.version so future quiz edits do not affect this assignment.',
    }),
    ApiBody({ type: CreateQuizAssignmentDto }),
    ApiResponse({ status: 201, type: CreateQuizAssignmentResult }),
    ApiResponse({ status: 400, description: 'Invalid window / mode mismatch / quiz not PUBLISHED' }),
    ApiResponse({ status: 403, description: 'Caller does not teach this class arm subject' }),
  );
}

export function ListTeacherAssignmentsSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        "Teacher view: list assignments the caller created OR teaches. Filter by classArmSubjectId, termId, status, mode.",
    }),
    ApiResponse({ status: 200, type: QuizAssignmentsListResult }),
  );
}

export function ListStudentAssignmentsSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        "Student view: list assignments for the caller's active class arms. Use effectiveStatus for state.",
    }),
    ApiResponse({ status: 200, type: QuizAssignmentsListResult }),
  );
}

export function GetQuizAssignmentSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Get assignment detail (teacher or enrolled student)' }),
    ApiParam({ name: 'id', description: 'QuizAssignment id' }),
    ApiResponse({ status: 200, type: QuizAssignmentResult }),
    ApiResponse({ status: 404, description: 'Not found or not visible to caller' }),
  );
}

export function UpdateQuizAssignmentSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Edit window / duration / settings. Only allowed before windowOpensAt. Cannot change quiz, classArmSubject, term — cancel and recreate instead.',
    }),
    ApiParam({ name: 'id', description: 'QuizAssignment id' }),
    ApiBody({ type: UpdateQuizAssignmentDto }),
    ApiResponse({ status: 200, type: UpdateQuizAssignmentResult }),
    ApiResponse({ status: 409, description: 'Window already opened or assignment archived' }),
  );
}

export function DeleteQuizAssignmentSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cancel an assignment. Rejected if any attempt has already started.',
    }),
    ApiParam({ name: 'id', description: 'QuizAssignment id' }),
    ApiResponse({ status: 200, type: DeleteQuizAssignmentResult }),
    ApiResponse({ status: 409, description: 'Attempts already exist' }),
  );
}

export function GrantOverrideSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Grant a per-student exception (RETRY / EXTRA_TIME / EXTEND_WINDOW). Reason is required for audit.',
    }),
    ApiParam({ name: 'id', description: 'QuizAssignment id' }),
    ApiBody({ type: GrantOverrideDto }),
    ApiResponse({ status: 201, type: GrantOverrideResult }),
    ApiResponse({ status: 400, description: 'Override payload invalid for the chosen type' }),
    ApiResponse({ status: 403, description: 'Caller does not manage this assignment' }),
  );
}

export function ReleaseResultsSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Release results to students for an assignment that was held (showResultsImmediately = false). Idempotent.',
    }),
    ApiParam({ name: 'id', description: 'QuizAssignment id' }),
    ApiResponse({ status: 200, type: ReleaseResultsResult }),
    ApiResponse({ status: 409, description: 'Already shown immediately or already released' }),
  );
}

export function MonitorAssignmentSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Teacher live-monitor view: list of every active student in the class arm with their attempt status.',
    }),
    ApiParam({ name: 'id', description: 'QuizAssignment id' }),
    ApiResponse({ status: 200, type: QuizAssignmentMonitorResult }),
  );
}

export function GetAssignmentResultsSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Teacher results view: per-student attempts that are SUBMITTED / GRADING / GRADED with scores.',
    }),
    ApiParam({ name: 'id', description: 'QuizAssignment id' }),
    ApiResponse({ status: 200, type: QuizAssignmentResultsResult }),
  );
}
