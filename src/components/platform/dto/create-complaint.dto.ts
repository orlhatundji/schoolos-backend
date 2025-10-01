import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComplaintCategory, ComplaintPriority } from '@prisma/client';

export class CreateComplaintDto {
  @ApiProperty({ description: 'Complaint title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Complaint description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Complaint category', enum: ComplaintCategory })
  @IsEnum(ComplaintCategory)
  category: ComplaintCategory;

  @ApiProperty({ description: 'Complaint priority', enum: ComplaintPriority, required: false })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @ApiProperty({ description: 'School ID if complaint is school-related', required: false })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiProperty({ description: 'Reporter user ID', required: false })
  @IsOptional()
  @IsUUID()
  reporterId?: string;
}
