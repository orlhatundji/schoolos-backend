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
import { CreateQuestionDto, QuestionQueryDto, UpdateQuestionDto } from './dto';
import { QuestionsService } from './questions.service';
import {
  CloneQuestionSwagger,
  CreateQuestionSwagger,
  DeleteQuestionSwagger,
  GetQuestionSwagger,
  ListLibraryQuestionsSwagger,
  ListMyQuestionsSwagger,
  UpdateQuestionSwagger,
} from './questions.swagger';
import {
  CloneQuestionResult,
  CreateQuestionResult,
  DeleteQuestionResult,
  QuestionResult,
  QuestionsListResult,
  UpdateQuestionResult,
} from './results/question.result';

@Controller('questions')
@ApiTags('Questions')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @CreateQuestionSwagger()
  async create(@GetCurrentUserId() userId: string, @Body() dto: CreateQuestionDto) {
    const question = await this.questionsService.create(userId, dto);
    return new CreateQuestionResult(new QuestionResult(question));
  }

  @Get('mine')
  @ListMyQuestionsSwagger()
  async listMine(@GetCurrentUserId() userId: string, @Query() query: QuestionQueryDto) {
    const { items, total, page, limit } = await this.questionsService.list(userId, 'mine', query);
    return new QuestionsListResult(items.map((q) => new QuestionResult(q)), total, page, limit);
  }

  @Get('library')
  @ListLibraryQuestionsSwagger()
  async listLibrary(@GetCurrentUserId() userId: string, @Query() query: QuestionQueryDto) {
    const { items, total, page, limit } = await this.questionsService.list(userId, 'library', query);
    return new QuestionsListResult(items.map((q) => new QuestionResult(q)), total, page, limit);
  }

  @Get(':id')
  @GetQuestionSwagger()
  async findById(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const question = await this.questionsService.findById(userId, id);
    return new QuestionResult(question);
  }

  @Patch(':id')
  @UpdateQuestionSwagger()
  async update(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    const question = await this.questionsService.update(userId, id, dto);
    return new UpdateQuestionResult(new QuestionResult(question));
  }

  @Delete(':id')
  @DeleteQuestionSwagger()
  async delete(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    await this.questionsService.softDelete(userId, id);
    return new DeleteQuestionResult();
  }

  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @CloneQuestionSwagger()
  async clone(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const question = await this.questionsService.clone(userId, id);
    return new CloneQuestionResult(new QuestionResult(question));
  }
}
