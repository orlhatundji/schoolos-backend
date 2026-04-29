import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import {
  AttachQuestionsDto,
  CreateQuizDto,
  QuizQueryDto,
  ReorderQuestionsDto,
  UpdateQuizDto,
} from './dto';
import { QuizzesService } from './quizzes.service';
import {
  AttachQuestionsSwagger,
  CloneQuizSwagger,
  CreateQuizSwagger,
  DeleteQuizSwagger,
  DetachQuestionSwagger,
  GetQuizSwagger,
  ListLibraryQuizzesSwagger,
  ListMyQuizzesSwagger,
  ReorderQuestionsSwagger,
  UpdateQuizSwagger,
} from './quizzes.swagger';
import {
  CloneQuizResult,
  CreateQuizResult,
  DeleteQuizResult,
  QuizDetailResult,
  QuizSummaryResult,
  QuizzesListResult,
  UpdateQuizResult,
} from './results/quiz.result';

@Controller('quizzes')
@ApiTags('Quizzes')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @CreateQuizSwagger()
  async create(@GetCurrentUserId() userId: string, @Body() dto: CreateQuizDto) {
    const quiz = await this.quizzesService.create(userId, dto);
    return new CreateQuizResult(new QuizDetailResult(quiz));
  }

  @Get('mine')
  @ListMyQuizzesSwagger()
  async listMine(@GetCurrentUserId() userId: string, @Query() query: QuizQueryDto) {
    const { items, total, page, limit } = await this.quizzesService.list(userId, 'mine', query);
    return new QuizzesListResult(items.map((q) => new QuizSummaryResult(q)), total, page, limit);
  }

  @Get('library')
  @ListLibraryQuizzesSwagger()
  async listLibrary(@GetCurrentUserId() userId: string, @Query() query: QuizQueryDto) {
    const { items, total, page, limit } = await this.quizzesService.list(userId, 'library', query);
    return new QuizzesListResult(items.map((q) => new QuizSummaryResult(q)), total, page, limit);
  }

  @Get(':id')
  @GetQuizSwagger()
  async findById(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const quiz = await this.quizzesService.findById(userId, id);
    return new QuizDetailResult(quiz);
  }

  @Patch(':id')
  @UpdateQuizSwagger()
  async update(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuizDto,
  ) {
    const quiz = await this.quizzesService.update(userId, id, dto);
    return new UpdateQuizResult(new QuizDetailResult(quiz));
  }

  @Delete(':id')
  @DeleteQuizSwagger()
  async delete(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    await this.quizzesService.softDelete(userId, id);
    return new DeleteQuizResult();
  }

  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @CloneQuizSwagger()
  async clone(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const quiz = await this.quizzesService.clone(userId, id);
    return new CloneQuizResult(new QuizDetailResult(quiz));
  }

  @Post(':id/questions')
  @HttpCode(HttpStatus.OK)
  @AttachQuestionsSwagger()
  async attachQuestions(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: AttachQuestionsDto,
  ) {
    const quiz = await this.quizzesService.attachQuestions(userId, id, dto);
    return new UpdateQuizResult(new QuizDetailResult(quiz));
  }

  @Delete(':id/questions/:questionId')
  @DetachQuestionSwagger()
  async detachQuestion(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ) {
    const quiz = await this.quizzesService.detachQuestion(userId, id, questionId);
    return new UpdateQuizResult(new QuizDetailResult(quiz));
  }

  @Patch(':id/questions/reorder')
  @ReorderQuestionsSwagger()
  async reorderQuestions(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: ReorderQuestionsDto,
  ) {
    const quiz = await this.quizzesService.reorderQuestions(userId, id, dto);
    return new UpdateQuizResult(new QuizDetailResult(quiz));
  }
}
