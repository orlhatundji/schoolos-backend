import { ApiProperty } from '@nestjs/swagger';

import { QuestionResult } from '../../results/question.result';
import { QuizDetailResult } from '../../../quizzes/results/quiz.result';

export class WordQuestionImportErrorResult {
  @ApiProperty() questionNumber: number;
  @ApiProperty() field: string;
  @ApiProperty() message: string;
  @ApiProperty({ required: false, nullable: true }) value?: string | null;

  constructor(error: {
    questionNumber: number;
    field: string;
    message: string;
    value?: string | null;
  }) {
    this.questionNumber = error.questionNumber;
    this.field = error.field;
    this.message = error.message;
    this.value = error.value ?? null;
  }
}

export class ImportWordQuizResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: QuizDetailResult }) quiz: QuizDetailResult;
  @ApiProperty() createdQuestionCount: number;
  @ApiProperty({ type: [WordQuestionImportErrorResult] })
  errors: WordQuestionImportErrorResult[];

  constructor(
    quiz: QuizDetailResult,
    createdQuestionCount: number,
    errors: WordQuestionImportErrorResult[] = [],
  ) {
    this.success = true;
    this.message = `Imported ${createdQuestionCount} question(s) into draft quiz`;
    this.quiz = quiz;
    this.createdQuestionCount = createdQuestionCount;
    this.errors = errors;
  }
}

export class ImportWordQuestionsResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty() createdQuestionCount: number;
  @ApiProperty({ type: [QuestionResult] }) questions: QuestionResult[];
  @ApiProperty({ type: [WordQuestionImportErrorResult] })
  errors: WordQuestionImportErrorResult[];

  constructor(
    questions: QuestionResult[],
    errors: WordQuestionImportErrorResult[] = [],
  ) {
    this.success = true;
    this.createdQuestionCount = questions.length;
    this.message = `Imported ${questions.length} question(s)`;
    this.questions = questions;
    this.errors = errors;
  }
}
