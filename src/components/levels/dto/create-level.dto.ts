import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsNumber, Min } from 'class-validator';

export class CreateLevelDto {
  @ApiProperty({
    description: 'Level name',
    example: 'JSS1',
  })
  @IsString()
  @Length(2, 50, { message: 'Level name must be between 2 and 50 characters' })
  name: string;

  @ApiProperty({
    description: 'Three character level code (e.g., JSS, SS1, PRI)',
    example: 'JSS',
  })
  @IsString()
  @Length(3, 3, { message: 'Level code must be exactly 3 characters' })
  code: string;

  @ApiProperty({
    description: 'Order of the level in the hierarchy (lower numbers appear first)',
    example: 1,
    minimum: 1,
  })
  @IsNumber({}, { message: 'Order must be a number' })
  @Min(1, { message: 'Order must be at least 1' })
  order: number;
}
