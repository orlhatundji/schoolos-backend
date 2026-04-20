import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RequestSchoolDeletionDto {
  @ApiProperty({
    description:
      'Reason the super-admin is requesting the school be deleted. Saved for audit and shown to the platform admin.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}
