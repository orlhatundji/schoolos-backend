import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function CreateSubjectSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new subject' }),
    ApiResponse({
      status: 201,
      description: 'Subject created successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    }),
  );
}

export function UpdateSubjectSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Update an existing subject' }),
    ApiResponse({
      status: 200,
      description: 'Subject updated successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: 404,
      description: 'Subject not found',
    }),
  );
}

export function DeleteSubjectSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a subject' }),
    ApiResponse({
      status: 200,
      description: 'Subject deleted successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - Subject is being used',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: 404,
      description: 'Subject not found',
    }),
  );
}
