import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function CreateDepartmentSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new department' }),
    ApiResponse({
      status: 201,
      description: 'Department created successfully',
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

export function UpdateDepartmentSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Update an existing department' }),
    ApiResponse({
      status: 200,
      description: 'Department updated successfully',
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
      description: 'Department not found',
    }),
  );
}

export function ArchiveDepartmentSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Archive a department' }),
    ApiResponse({
      status: 200,
      description: 'Department archived successfully',
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
      description: 'Department not found',
    }),
  );
}

export function UnarchiveDepartmentSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Unarchive a department' }),
    ApiResponse({
      status: 200,
      description: 'Department unarchived successfully',
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
      description: 'Department not found',
    }),
  );
}

export function DeleteDepartmentSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a department' }),
    ApiResponse({
      status: 200,
      description: 'Department deleted successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - Department has associated data',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: 404,
      description: 'Department not found',
    }),
  );
}
