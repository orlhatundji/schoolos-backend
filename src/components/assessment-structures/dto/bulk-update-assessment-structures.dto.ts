import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';
import { CreateAssessmentStructureDto } from './create-assessment-structure.dto';

export class BulkUpdateAssessmentStructureItemDto extends CreateAssessmentStructureDto {
  @ApiProperty({
    description: 'ID of the assessment structure to update (required for updates)',
    example: 'uuid-string',
    required: false,
  })
  @IsOptional()
  @IsString()
  id?: string;
}

export class BulkUpdateAssessmentStructuresDto {
  @ApiProperty({
    description: 'Array of assessment structures to create or update',
    type: [BulkUpdateAssessmentStructureItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateAssessmentStructureItemDto)
  assessmentStructures: BulkUpdateAssessmentStructureItemDto[];
}
