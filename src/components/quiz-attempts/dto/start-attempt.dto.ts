import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartAttemptDto {
  @ApiProperty({ description: 'QuizAssignment to attempt' })
  @IsUUID()
  quizAssignmentId: string;
}
