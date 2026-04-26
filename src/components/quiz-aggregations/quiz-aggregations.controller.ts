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
import { AggregationQueryDto, CreateAggregationDto, UpdateAggregationDto } from './dto';
import { QuizAggregationsService } from './quiz-aggregations.service';
import {
  CreateAggregationSwagger,
  DeleteAggregationSwagger,
  FinalizeAggregationSwagger,
  GetAggregationSwagger,
  ListAggregationsSwagger,
  PreviewAggregationSwagger,
  UpdateAggregationSwagger,
} from './quiz-aggregations.swagger';
import {
  AggregationItemPreviewResult,
  AggregationPreviewResult,
  AggregationResult,
  AggregationsListResult,
  CreateAggregationResult,
  DeleteAggregationResult,
  FinalizeAggregationResult,
  StudentPreviewRowResult,
  UpdateAggregationResult,
} from './results/aggregation.result';

@Controller('quiz-aggregations')
@ApiTags('Quiz Aggregations')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class QuizAggregationsController {
  constructor(private readonly service: QuizAggregationsService) {}

  @Post()
  @CreateAggregationSwagger()
  async create(@GetCurrentUserId() userId: string, @Body() dto: CreateAggregationDto) {
    const a = await this.service.create(userId, dto);
    return new CreateAggregationResult(new AggregationResult(a));
  }

  @Get()
  @ListAggregationsSwagger()
  async list(@GetCurrentUserId() userId: string, @Query() query: AggregationQueryDto) {
    const { items, total, page, limit } = await this.service.list(userId, query);
    return new AggregationsListResult(
      items.map((a) => new AggregationResult(a)),
      total,
      page,
      limit,
    );
  }

  @Get(':id')
  @GetAggregationSwagger()
  async findById(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const a = await this.service.findById(userId, id);
    return new AggregationResult(a);
  }

  @Patch(':id')
  @UpdateAggregationSwagger()
  async update(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAggregationDto,
  ) {
    const a = await this.service.update(userId, id, dto);
    return new UpdateAggregationResult(new AggregationResult(a));
  }

  @Delete(':id')
  @DeleteAggregationSwagger()
  async delete(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    await this.service.softDelete(userId, id);
    return new DeleteAggregationResult();
  }

  @Post(':id/preview')
  @HttpCode(HttpStatus.OK)
  @PreviewAggregationSwagger()
  async preview(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const { aggregation, rows } = await this.service.preview(userId, id);
    const aggregationResult = new AggregationResult(aggregation);
    const previewRows = rows.map((row) => {
      const r = new StudentPreviewRowResult();
      r.studentId = row.studentId;
      r.studentNo = row.studentNo;
      r.firstName = row.firstName;
      r.lastName = row.lastName;
      r.items = row.items.map(
        (it) =>
          new AggregationItemPreviewResult(
            it.quizAssignmentId,
            it.quizTitle,
            it.percentage,
            it.missing,
          ),
      );
      r.computedPercentage = row.computedPercentage;
      r.rescaledScore = row.rescaledScore;
      return r;
    });
    return new AggregationPreviewResult(aggregationResult, previewRows);
  }

  @Post(':id/finalize')
  @HttpCode(HttpStatus.OK)
  @FinalizeAggregationSwagger()
  async finalize(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const { upsertedRows, finalizedAt } = await this.service.finalize(userId, id);
    return new FinalizeAggregationResult(upsertedRows, finalizedAt);
  }
}
