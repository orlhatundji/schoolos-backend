import { IsArray, IsBoolean, IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcademicSettingsDto {
  @ApiProperty({
    description: 'List of core subjects that students must pass',
    example: ['Mathematics', 'English']
  })
  @IsArray()
  @IsString({ each: true })
  coreSubjects: string[];

  @ApiProperty({
    description: 'Minimum number of subjects a student must pass',
    example: 4,
    minimum: 1,
    maximum: 20
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  totalSubjectsPassed: number;

  @ApiProperty({
    description: 'Minimum overall academic average required for promotion',
    example: 50,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  totalAverage: number;

  @ApiProperty({
    description: 'Whether to include attendance as promotion criteria',
    example: true
  })
  @IsBoolean()
  useAttendance: boolean;

  @ApiProperty({
    description: 'Minimum attendance rate required (if attendance is enabled)',
    example: 50,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumAttendanceRate: number;
}
