import { ApiProperty } from '@nestjs/swagger';

export class CategoryResult {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Core',
  })
  name: string;

  @ApiProperty({
    description: 'Category description',
    example: 'Essential subjects required for all students',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Whether this is a default category',
    example: true,
  })
  isDefault: boolean;

  @ApiProperty({
    description: 'School ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  schoolId: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class CategoriesListResult {
  @ApiProperty({
    description: 'List of categories',
    type: [CategoryResult],
  })
  categories: CategoryResult[];

  constructor(categories: CategoryResult[]) {
    this.categories = categories;
  }
}

export class CreateCategoryResult {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Category created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Created category data',
    type: CategoryResult,
  })
  category: CategoryResult;

  constructor(category: CategoryResult) {
    this.success = true;
    this.message = 'Category created successfully';
    this.category = category;
  }
}
