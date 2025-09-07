import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export class UpdateSchoolSignupStatusDto {
  @ApiProperty({
    description: 'Action to perform on the signup request',
    enum: ['approve', 'reject'],
  })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiProperty({
    description: 'Notes from the reviewer (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Reason for rejection (required when action is reject)',
    required: false,
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
