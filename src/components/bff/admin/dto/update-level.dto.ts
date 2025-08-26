import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateLevelDto {
  @ApiProperty({
    description: 'Level name',
    example: 'JSS1',
    required: false,
  })
  @IsString()
  @Length(2, 50, { message: 'Level name must be between 2 and 50 characters' })
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Three character level code (e.g., JSS, SS1, PRI)',
    example: 'JSS',
    required: false,
  })
  @IsString()
  @Length(3, 3, { message: 'Level code must be exactly 3 characters' })
  @IsOptional()
  code?: string;
}
