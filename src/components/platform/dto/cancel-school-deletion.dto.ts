import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSchoolDeletionDto {
  @ApiPropertyOptional({
    description:
      'Optional note captured when the super-admin changes their mind about deleting the school.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
