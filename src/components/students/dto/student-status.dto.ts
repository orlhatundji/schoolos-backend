import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { StudentStatus } from '@prisma/client';

export class UpdateStudentStatusDto {
  @ApiProperty({ enum: StudentStatus })
  @IsEnum(StudentStatus)
  status: StudentStatus;

  @ApiProperty()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty()
  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  notes?: string;
}
