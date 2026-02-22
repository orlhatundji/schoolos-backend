import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoriesListResult, CreateCategoryResult } from './results/category.result';

export function GetCategoriesSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all categories for the school' }),
    ApiResponse({
      status: 200,
      description: 'Categories retrieved successfully',
      type: CategoriesListResult,
    }),
  );
}

export function CreateCategorySwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new category' }),
    ApiBody({ type: CreateCategoryDto }),
    ApiResponse({
      status: 201,
      description: 'Category created successfully',
      type: CreateCategoryResult,
    }),
    ApiResponse({
      status: 409,
      description: 'Category with this name already exists',
    }),
  );
}
