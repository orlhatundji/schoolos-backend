import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class BulkDeleteQuestionsDto {
  @ApiProperty({
    type: [String],
    description:
      'Question ids to delete. Questions already attached to quizzes are archived from reusable lists instead.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];
}
