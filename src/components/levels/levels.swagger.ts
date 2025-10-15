import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function CreateLevelSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new level' }),
    ApiResponse({
      status: 201,
      description: 'Level created successfully',
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

export function UpdateLevelSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Update an existing level' }),
    ApiResponse({
      status: 200,
      description: 'Level updated successfully',
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
      description: 'Level not found',
    }),
  );
}

export function ArchiveLevelSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Archive a level' }),
    ApiResponse({
      status: 200,
      description: 'Level archived successfully',
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
      description: 'Level not found',
    }),
  );
}

export function UnarchiveLevelSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Unarchive a level' }),
    ApiResponse({
      status: 200,
      description: 'Level unarchived successfully',
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
      description: 'Level not found',
    }),
  );
}

export function ReorderLevelSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Reorder a level up or down in the hierarchy' }),
    ApiResponse({
      status: 200,
      description: 'Level reordered successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - Cannot move level (already at boundary)',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: 404,
      description: 'Level not found',
    }),
  );
}

export function DeleteLevelSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a level' }),
    ApiResponse({
      status: 200,
      description: 'Level deleted successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - Level has associated data',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
    }),
    ApiResponse({
      status: 404,
      description: 'Level not found',
    }),
  );
}
