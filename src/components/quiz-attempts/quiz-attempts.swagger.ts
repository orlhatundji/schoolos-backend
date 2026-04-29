import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { PageEventDto, SaveResponsesDto, StartAttemptDto } from './dto';
import {
  AttemptResult,
  AttemptsListResult,
  PageEventResult,
  SaveResponsesResult,
  StartAttemptResult,
  SubmitAttemptResult,
} from './results/attempt.result';

export function StartAttemptSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        "Start (or resume) an attempt. Returns the attempt with stripped questions. If an IN_PROGRESS attempt already exists for this assignment, returns it instead of creating a new one.",
    }),
    ApiBody({ type: StartAttemptDto }),
    ApiResponse({ status: 201, type: StartAttemptResult }),
    ApiResponse({ status: 403, description: 'Not enrolled in the class arm' }),
    ApiResponse({ status: 409, description: 'Window closed / max attempts reached / SYNC_START grace passed' }),
  );
}

export function SaveResponsesSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Autosave responses for the in-progress attempt. Returns the server-canonical dueAt — client should re-sync the timer.',
    }),
    ApiParam({ name: 'id', description: 'QuizAttempt id' }),
    ApiBody({ type: SaveResponsesDto }),
    ApiResponse({ status: 200, type: SaveResponsesResult }),
    ApiResponse({
      status: 409,
      description: 'Time is up — attempt has been auto-submitted, or status is no longer IN_PROGRESS',
    }),
  );
}

export function SubmitAttemptSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Submit the attempt early. Marks it SUBMITTED and enqueues grading. autoSubmitted=true if past dueAt.',
    }),
    ApiParam({ name: 'id', description: 'QuizAttempt id' }),
    ApiResponse({ status: 200, type: SubmitAttemptResult }),
    ApiResponse({ status: 409, description: 'Already submitted' }),
  );
}

export function PageEventSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Append a page-visibility event to the attempt for anti-cheat trace (HIDDEN, BLUR, PASTE, etc).',
    }),
    ApiParam({ name: 'id', description: 'QuizAttempt id' }),
    ApiBody({ type: PageEventDto }),
    ApiResponse({ status: 200, type: PageEventResult }),
  );
}

export function ListMyAttemptsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: "List the calling student's attempts" }),
    ApiResponse({ status: 200, type: AttemptsListResult }),
  );
}

export function GetMyAttemptSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Get attempt detail. Correctness + explanations + scores are included only when results are visible (showResultsImmediately or resultsReleasedAt set) AND showCorrectAnswers is true.',
    }),
    ApiParam({ name: 'id', description: 'QuizAttempt id' }),
    ApiResponse({ status: 200, type: AttemptResult }),
  );
}
