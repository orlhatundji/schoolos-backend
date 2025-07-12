import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AssessmentComponentDto {
  @ApiProperty({ example: 'Test 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;
}

export class CreateAssessmentStructureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicSessionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [AssessmentComponentDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AssessmentComponentDto)
  components: AssessmentComponentDto[];
}
