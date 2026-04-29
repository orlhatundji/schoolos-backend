import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { CreateAggregationDto, UpdateAggregationDto } from './dto';
import {
  AggregationPreviewResult,
  AggregationResult,
  AggregationsListResult,
  CreateAggregationResult,
  DeleteAggregationResult,
  FinalizeAggregationResult,
  UpdateAggregationResult,
} from './results/aggregation.result';

export function CreateAggregationSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Create a DRAFT aggregation that maps N quiz assignments to a single AssessmentStructureTemplate slot.',
    }),
    ApiBody({ type: CreateAggregationDto }),
    ApiResponse({ status: 201, type: CreateAggregationResult }),
    ApiResponse({ status: 400, description: 'Invalid items or slot not found in template' }),
    ApiResponse({ status: 403, description: 'Caller does not teach this class arm subject' }),
  );
}

export function ListAggregationsSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'List aggregations for class arm subjects the caller teaches',
    }),
    ApiResponse({ status: 200, type: AggregationsListResult }),
  );
}

export function GetAggregationSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Get an aggregation with its items' }),
    ApiParam({ name: 'id', description: 'Aggregation id' }),
    ApiResponse({ status: 200, type: AggregationResult }),
  );
}

export function UpdateAggregationSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Edit a DRAFT aggregation. Items list is replaced wholesale when provided. classArmSubjectId / termId / assessmentTemplateEntryId cannot be changed.',
    }),
    ApiParam({ name: 'id', description: 'Aggregation id' }),
    ApiBody({ type: UpdateAggregationDto }),
    ApiResponse({ status: 200, type: UpdateAggregationResult }),
    ApiResponse({ status: 409, description: 'Aggregation is FINALIZED' }),
  );
}

export function DeleteAggregationSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Delete a DRAFT aggregation. FINALIZED aggregations cannot be deleted (their gradebook entries already exist).',
    }),
    ApiParam({ name: 'id', description: 'Aggregation id' }),
    ApiResponse({ status: 200, type: DeleteAggregationResult }),
    ApiResponse({ status: 409, description: 'Aggregation is FINALIZED' }),
  );
}

export function PreviewAggregationSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        'Compute per-student scores without persisting. Use this to sanity-check before /finalize.',
    }),
    ApiParam({ name: 'id', description: 'Aggregation id' }),
    ApiResponse({ status: 200, type: AggregationPreviewResult }),
  );
}

export function FinalizeAggregationSwagger() {
  return applyDecorators(
    ApiOperation({
      summary:
        "Recompute and write ClassArmStudentAssessment rows into the gradebook. Idempotent — re-finalizing re-runs compute and re-upserts. The slot's name is used for the upsert key, so the score lands in the correct gradebook column.",
    }),
    ApiParam({ name: 'id', description: 'Aggregation id' }),
    ApiResponse({ status: 200, type: FinalizeAggregationResult }),
  );
}
