import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateDepartmentDto {
  @ApiProperty({
    description: 'Department name',
    example: 'Advanced Science Department',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Three character department code (e.g., SCI, MAT, ENG)',
    example: 'SCI',
  })
  @IsString()
  @Length(3, 3, { message: 'Department code must be exactly 3 characters' })
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: 'Head of Department (HOD) teacher ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  hodId?: string;
}
