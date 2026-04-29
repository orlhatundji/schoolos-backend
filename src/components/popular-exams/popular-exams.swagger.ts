import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { CreatePopularExamDto, UpdatePopularExamDto } from './dto';
import {
  CreatePopularExamResult,
  DeletePopularExamResult,
  PopularExamsListResult,
  UpdatePopularExamResult,
} from './results/popular-exam.result';

export function ListPopularExamsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'List popular exams (filterable by active / country)' }),
    ApiResponse({ status: 200, type: PopularExamsListResult }),
  );
}

export function CreatePopularExamSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a popular exam (system admin only)' }),
    ApiBody({ type: CreatePopularExamDto }),
    ApiResponse({ status: 201, type: CreatePopularExamResult }),
    ApiResponse({ status: 409, description: 'Code already in use' }),
  );
}

export function UpdatePopularExamSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a popular exam (system admin only)' }),
    ApiParam({ name: 'id', description: 'Popular exam id' }),
    ApiBody({ type: UpdatePopularExamDto }),
    ApiResponse({ status: 200, type: UpdatePopularExamResult }),
    ApiResponse({ status: 404, description: 'Not found' }),
  );
}

export function DeletePopularExamSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Soft-delete a popular exam (system admin only). Rejects if any question references it.',
    }),
    ApiParam({ name: 'id', description: 'Popular exam id' }),
    ApiResponse({ status: 200, type: DeletePopularExamResult }),
    ApiResponse({ status: 404, description: 'Not found' }),
    ApiResponse({ status: 409, description: 'Exam is referenced by questions; deactivate instead' }),
  );
}
