import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesListResult } from './results/category.result';
import { CreateCategoryResult } from './results/category.result';
import { UpdateCategoryResult } from './results/category.result';
import { DeleteCategoryResult } from './results/category.result';

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

export function UpdateCategorySwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a category' }),
    ApiParam({ name: 'categoryId', description: 'Category ID' }),
    ApiBody({ type: UpdateCategoryDto }),
    ApiResponse({
      status: 200,
      description: 'Category updated successfully',
      type: UpdateCategoryResult,
    }),
    ApiResponse({
      status: 404,
      description: 'Category not found',
    }),
    ApiResponse({
      status: 409,
      description: 'Category with this name already exists',
    }),
  );
}

export function DeleteCategorySwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a category' }),
    ApiParam({ name: 'categoryId', description: 'Category ID' }),
    ApiResponse({
      status: 200,
      description: 'Category deleted successfully',
      type: DeleteCategoryResult,
    }),
    ApiResponse({
      status: 404,
      description: 'Category not found',
    }),
    ApiResponse({
      status: 400,
      description: 'Cannot delete default category or category in use',
    }),
  );
}
