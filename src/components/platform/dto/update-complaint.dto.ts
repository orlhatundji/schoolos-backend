import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComplaintStatus, ComplaintPriority } from '@prisma/client';

export class UpdateComplaintDto {
  @ApiProperty({ description: 'Complaint status', enum: ComplaintStatus, required: false })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @ApiProperty({ description: 'Complaint priority', enum: ComplaintPriority, required: false })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @ApiProperty({ description: 'System admin ID to assign complaint to', required: false })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
