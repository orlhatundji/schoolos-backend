import { PartialType } from '@nestjs/swagger';

import { CreateQuizDto } from './create-quiz.dto';

/**
 * All fields optional. When provided, replaces topicIds wholesale.
 * Bumps Quiz.version on every update so QuizAssignment snapshots remain
 * faithful to the version they were assigned with.
 */
export class UpdateQuizDto extends PartialType(CreateQuizDto) {}
