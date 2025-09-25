import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassroomDto {
  @ApiProperty({
    description: 'Name of the classroom (e.g., "A", "B", "Science")',
    example: 'A',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Level ID for the classroom',
    example: 'uuid-of-level',
  })
  @IsUUID()
  @IsNotEmpty()
  levelId: string;


  @ApiProperty({
    description: 'Class teacher ID (optional)',
    example: 'uuid-of-teacher',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  classTeacherId?: string;
}
