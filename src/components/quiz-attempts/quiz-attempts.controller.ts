import {
  Body,
  Controller,
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
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { GetCurrentUserId } from '../../common/decorators';
import { AssessmentsFeatureGuard } from '../../common/guards';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { PageEventDto, SaveResponsesDto, StartAttemptDto } from './dto';
import { QuizAttemptsService } from './quiz-attempts.service';
import {
  GetMyAttemptSwagger,
  ListMyAttemptsSwagger,
  PageEventSwagger,
  SaveResponsesSwagger,
  StartAttemptSwagger,
  SubmitAttemptSwagger,
} from './quiz-attempts.swagger';
import {
  AttemptResult,
  AttemptSummaryResult,
  AttemptsListResult,
  PageEventResult,
  SaveResponsesResult,
  StartAttemptResult,
  SubmitAttemptResult,
} from './results/attempt.result';

class ListAttemptsQueryDto {
  @IsOptional()
  @IsUUID()
  quizAssignmentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

@Controller('quiz-attempts')
@ApiTags('Quiz Attempts')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class QuizAttemptsController {
  constructor(private readonly service: QuizAttemptsService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AssessmentsFeatureGuard)
  @StartAttemptSwagger()
  async start(@GetCurrentUserId() userId: string, @Body() dto: StartAttemptDto) {
    const view = await this.service.start(userId, dto);
    return new StartAttemptResult(new AttemptResult(view.attempt, view.ctx, view.quizId));
  }

  @Get('mine')
  @ListMyAttemptsSwagger()
  async listMine(
    @GetCurrentUserId() userId: string,
    @Query() query: ListAttemptsQueryDto,
  ) {
    const { items, total, page, limit } = await this.service.listMine(userId, query);
    const summaries = items.map((a) => {
      const settings = (a.quizAssignment.quiz.defaultSettings ?? {}) as Record<string, unknown>;
      const showResultsImmediately =
        a.quizAssignment.showResultsImmediately ??
        (typeof settings.showResultsImmediately === 'boolean'
          ? settings.showResultsImmediately
          : false);
      const resultsVisible =
        showResultsImmediately || a.quizAssignment.resultsReleasedAt !== null;
      return new AttemptSummaryResult(a, resultsVisible);
    });
    return new AttemptsListResult(summaries, total, page, limit);
  }

  @Get(':id')
  @GetMyAttemptSwagger()
  async getMine(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const view = await this.service.getMine(userId, id);
    return new AttemptResult(view.attempt, view.ctx, view.quizId);
  }

  @Patch(':id/responses')
  @SaveResponsesSwagger()
  async saveResponses(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: SaveResponsesDto,
  ) {
    const { saved, dueAt } = await this.service.saveResponses(userId, id, dto);
    return new SaveResponsesResult(saved, dueAt);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @SubmitAttemptSwagger()
  async submit(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const attempt = await this.service.submit(userId, id);
    // resultsVisible irrelevant immediately after submit; set false for the summary.
    return new SubmitAttemptResult(new AttemptSummaryResult(attempt, false));
  }

  @Post(':id/page-event')
  @HttpCode(HttpStatus.OK)
  @PageEventSwagger()
  async pageEvent(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: PageEventDto,
  ) {
    await this.service.pageEvent(userId, id, dto);
    return new PageEventResult();
  }
}
