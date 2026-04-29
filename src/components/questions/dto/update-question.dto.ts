import { PartialType } from '@nestjs/swagger';

import { CreateQuestionDto } from './create-question.dto';

/**
 * All fields optional. When provided, replaces the corresponding collection
 * (options / topicIds / popularExams) wholesale rather than merging.
 *
 * Edits to a question that is referenced by any PUBLISHED quiz are rejected;
 * the API guides the caller to clone the question instead.
 */
export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}
