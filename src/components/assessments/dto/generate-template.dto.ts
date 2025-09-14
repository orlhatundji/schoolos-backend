import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateTemplateDto {
  @ApiProperty({
    description: 'Subject name for the template',
    example: 'Mathematics',
  })
  @IsString()
  @IsNotEmpty()
  subjectName: string;

  @ApiProperty({
    description: 'Term name for the template',
    example: 'First Term',
  })
  @IsString()
  @IsNotEmpty()
  termName: string;

  @ApiProperty({
    description: 'Academic session name for the template',
    example: '2024/2025',
  })
  @IsString()
  @IsNotEmpty()
  sessionName: string;

  @ApiProperty({
    description: 'Level name for the template',
    example: 'JSS 2',
  })
  @IsString()
  @IsNotEmpty()
  levelName: string;

  @ApiProperty({
    description: 'Class arm name for the template',
    example: 'A',
  })
  @IsString()
  @IsNotEmpty()
  classArmName: string;
}
