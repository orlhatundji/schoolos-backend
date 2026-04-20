import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectSchoolDeletionDto {
  @ApiProperty({
    description: 'Reason the platform admin is rejecting the deletion request.',
    minLength: 5,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason!: string;
}
