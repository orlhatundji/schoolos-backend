import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClassroomDto {
  @ApiProperty({
    description: 'Name of the classroom (e.g., "A", "B", "Science")',
    example: 'A',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Level ID for the classroom',
    example: 'uuid-of-level',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  levelId?: string;

  @ApiProperty({
    description: 'Class teacher ID (optional)',
    example: 'uuid-of-teacher',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  classTeacherId?: string;

  @ApiProperty({
    description: 'Class captain ID (optional)',
    example: 'uuid-of-student',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  captainId?: string;

  @ApiProperty({
    description: 'Location of the classroom (optional)',
    example: 'Room 101, Block A',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;
}
