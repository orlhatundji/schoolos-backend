import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsUUID, IsOptional } from 'class-validator';

export class ImportStudentsDto {
  @ApiProperty({
    description: 'ID of the target class arm to import students to',
    example: 'class-arm-uuid',
  })
  @IsString()
  @IsUUID()
  targetClassArmId: string;

  @ApiProperty({
    description: 'Array of student IDs to import',
    example: ['student-uuid-1', 'student-uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  studentIds: string[];

  @ApiProperty({
    description: 'ID of the source class arm (optional, for audit/logging)',
    example: 'source-class-arm-uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  sourceClassArmId?: string;
}

export class CopyClassroomsDto {
  @ApiProperty({
    description: 'ID of the target academic session to copy classrooms to',
    example: 'session-uuid',
  })
  @IsString()
  @IsUUID()
  targetSessionId: string;
}
