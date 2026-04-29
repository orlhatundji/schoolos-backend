import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import {
  AttachQuestionsDto,
  CreateQuizDto,
  ReorderQuestionsDto,
  UpdateQuizDto,
} from './dto';
import {
  CloneQuizResult,
  CreateQuizResult,
  DeleteQuizResult,
  QuizDetailResult,
  QuizzesListResult,
  UpdateQuizResult,
} from './results/quiz.result';

export function CreateQuizSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a quiz (teacher → TEACHER_AUTHORED, system admin → SCHOS_CURATED)',
    }),
    ApiBody({ type: CreateQuizDto }),
    ApiResponse({ status: 201, type: CreateQuizResult }),
    ApiResponse({ status: 400, description: 'Validation failed (subject/level mismatch with owner)' }),
    ApiResponse({ status: 403, description: 'User type not allowed to author quizzes' }),
  );
}

export function ListMyQuizzesSwagger() {
  return applyDecorators(
    ApiOperation({ summary: "List the calling teacher's quizzes (filterable, paginated)" }),
    ApiResponse({ status: 200, type: QuizzesListResult }),
  );
}

export function ListLibraryQuizzesSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Browse the schos curated quiz library (filterable, paginated)' }),
    ApiResponse({ status: 200, type: QuizzesListResult }),
  );
}

export function GetQuizSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a quiz by id with full questions list (visible if curated or owned by caller)',
    }),
    ApiParam({ name: 'id', description: 'Quiz id' }),
    ApiResponse({ status: 200, type: QuizDetailResult }),
    ApiResponse({ status: 404, description: 'Not found or not visible' }),
  );
}

export function UpdateQuizSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Update quiz metadata. Bumps version. Existing assignments stay pinned to the version they were assigned with.',
    }),
    ApiParam({ name: 'id', description: 'Quiz id' }),
    ApiBody({ type: UpdateQuizDto }),
    ApiResponse({ status: 200, type: UpdateQuizResult }),
    ApiResponse({ status: 403, description: 'You can only modify your own quizzes' }),
  );
}

export function DeleteQuizSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Soft-archive a quiz. Rejected if any non-archived assignment still references it.',
    }),
    ApiParam({ name: 'id', description: 'Quiz id' }),
    ApiResponse({ status: 200, type: DeleteQuizResult }),
    ApiResponse({ status: 409, description: 'Quiz has active assignments' }),
  );
}

export function CloneQuizSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        "Clone a curated (SCHOS_CURATED) quiz into the calling teacher's school as DRAFT. References the same curated questions; clone individual questions separately to customize them.",
    }),
    ApiParam({ name: 'id', description: 'Curated quiz id' }),
    ApiResponse({ status: 201, type: CloneQuizResult }),
    ApiResponse({ status: 403, description: 'Only teachers can clone' }),
    ApiResponse({ status: 404, description: 'Curated quiz not found' }),
  );
}

export function AttachQuestionsSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Attach existing questions from the bank with order + optional weightOverride. Caller must own the quiz; questions must be curated or owned by caller. Curated quizzes accept curated questions only.',
    }),
    ApiParam({ name: 'id', description: 'Quiz id' }),
    ApiBody({ type: AttachQuestionsDto }),
    ApiResponse({ status: 200, type: UpdateQuizResult }),
    ApiResponse({ status: 403, description: 'Cannot attach a question you do not own' }),
    ApiResponse({ status: 409, description: 'Question already attached to this quiz' }),
  );
}

export function DetachQuestionSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Detach a question from this quiz. Does NOT delete the underlying question.',
    }),
    ApiParam({ name: 'id', description: 'Quiz id' }),
    ApiParam({ name: 'questionId', description: 'Question id' }),
    ApiResponse({ status: 200, type: UpdateQuizResult }),
    ApiResponse({ status: 404, description: 'Question is not attached to this quiz' }),
  );
}

export function ReorderQuestionsSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Bulk reorder. Payload must include EVERY currently-attached question exactly once.',
    }),
    ApiParam({ name: 'id', description: 'Quiz id' }),
    ApiBody({ type: ReorderQuestionsDto }),
    ApiResponse({ status: 200, type: UpdateQuizResult }),
    ApiResponse({ status: 400, description: 'Reorder payload is incomplete or has duplicates' }),
  );
}
