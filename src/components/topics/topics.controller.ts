import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { SystemAdminGuard } from '../../common/guards';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { CreateTopicDto, TopicQueryDto, UpdateTopicDto } from './dto';
import {
  CreateTopicResult,
  DeleteTopicResult,
  TopicResult,
  TopicsListResult,
  UpdateTopicResult,
} from './results/topic.result';
import { TopicsService } from './topics.service';
import {
  CreateTopicSwagger,
  DeleteTopicSwagger,
  GetTopicSwagger,
  ListTopicsSwagger,
  UpdateTopicSwagger,
} from './topics.swagger';

@Controller('topics')
@ApiTags('Topics')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @ListTopicsSwagger()
  async list(@Query() query: TopicQueryDto) {
    const topics = await this.topicsService.list(query);
    return new TopicsListResult(topics.map((t) => new TopicResult(t)));
  }

  @Get(':id')
  @GetTopicSwagger()
  async findById(@Param('id') id: string) {
    const topic = await this.topicsService.findById(id);
    return new TopicResult(topic);
  }

  @Post()
  @UseGuards(SystemAdminGuard)
  @CreateTopicSwagger()
  async create(@Body() dto: CreateTopicDto) {
    const topic = await this.topicsService.create(dto);
    return new CreateTopicResult(new TopicResult(topic));
  }

  @Patch(':id')
  @UseGuards(SystemAdminGuard)
  @UpdateTopicSwagger()
  async update(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    const topic = await this.topicsService.update(id, dto);
    return new UpdateTopicResult(new TopicResult(topic));
  }

  @Delete(':id')
  @UseGuards(SystemAdminGuard)
  @DeleteTopicSwagger()
  async delete(@Param('id') id: string) {
    await this.topicsService.softDelete(id);
    return new DeleteTopicResult();
  }
}
