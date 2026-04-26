import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { CreateQuestionDto, UpdateQuestionDto } from './dto';
import {
  CloneQuestionResult,
  CreateQuestionResult,
  DeleteQuestionResult,
  QuestionResult,
  QuestionsListResult,
  UpdateQuestionResult,
} from './results/question.result';

export function CreateQuestionSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a question (teacher → TEACHER_AUTHORED, system admin → SCHOS_CURATED)',
    }),
    ApiBody({ type: CreateQuestionDto }),
    ApiResponse({ status: 201, type: CreateQuestionResult }),
    ApiResponse({ status: 400, description: 'Validation failed (subject/level mismatch, type-specific config invalid)' }),
    ApiResponse({ status: 403, description: 'User type not allowed to author questions' }),
  );
}

export function ListMyQuestionsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: "List the calling teacher's question bank (filterable, paginated)" }),
    ApiResponse({ status: 200, type: QuestionsListResult }),
  );
}

export function ListLibraryQuestionsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Browse the schos curated question library (filterable, paginated)' }),
    ApiResponse({ status: 200, type: QuestionsListResult }),
  );
}

export function GetQuestionSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a question by id (visible if curated or owned by caller)',
    }),
    ApiParam({ name: 'id', description: 'Question id' }),
    ApiResponse({ status: 200, type: QuestionResult }),
    ApiResponse({ status: 404, description: 'Not found or not visible' }),
  );
}

export function UpdateQuestionSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a question. Rejected if it is referenced by any PUBLISHED quiz — clone it instead.',
    }),
    ApiParam({ name: 'id', description: 'Question id' }),
    ApiBody({ type: UpdateQuestionDto }),
    ApiResponse({ status: 200, type: UpdateQuestionResult }),
    ApiResponse({ status: 403, description: 'You can only modify your own questions' }),
    ApiResponse({ status: 409, description: 'Question is in use by a published quiz' }),
  );
}

export function DeleteQuestionSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Soft-archive a question. Rejected if any quiz still references it.',
    }),
    ApiParam({ name: 'id', description: 'Question id' }),
    ApiResponse({ status: 200, type: DeleteQuestionResult }),
    ApiResponse({ status: 409, description: 'Question is referenced by quizzes; detach first' }),
  );
}

export function CloneQuestionSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: "Clone a curated (SCHOS_CURATED) question into the calling teacher's bank as DRAFT",
    }),
    ApiParam({ name: 'id', description: 'Curated question id' }),
    ApiResponse({ status: 201, type: CloneQuestionResult }),
    ApiResponse({ status: 403, description: 'Only teachers can clone' }),
    ApiResponse({ status: 404, description: 'Curated question not found' }),
  );
}

