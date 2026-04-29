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
import {
  CreatePopularExamDto,
  PopularExamQueryDto,
  UpdatePopularExamDto,
} from './dto';
import { PopularExamsService } from './popular-exams.service';
import {
  CreatePopularExamSwagger,
  DeletePopularExamSwagger,
  ListPopularExamsSwagger,
  UpdatePopularExamSwagger,
} from './popular-exams.swagger';
import {
  CreatePopularExamResult,
  DeletePopularExamResult,
  PopularExamResult,
  PopularExamsListResult,
  UpdatePopularExamResult,
} from './results/popular-exam.result';

@Controller('popular-exams')
@ApiTags('Popular Exams')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class PopularExamsController {
  constructor(private readonly popularExamsService: PopularExamsService) {}

  @Get()
  @ListPopularExamsSwagger()
  async list(@Query() query: PopularExamQueryDto) {
    const exams = await this.popularExamsService.list(query);
    return new PopularExamsListResult(exams.map((e) => new PopularExamResult(e)));
  }

  @Post()
  @UseGuards(SystemAdminGuard)
  @CreatePopularExamSwagger()
  async create(@Body() dto: CreatePopularExamDto) {
    const exam = await this.popularExamsService.create(dto);
    return new CreatePopularExamResult(new PopularExamResult(exam));
  }

  @Patch(':id')
  @UseGuards(SystemAdminGuard)
  @UpdatePopularExamSwagger()
  async update(@Param('id') id: string, @Body() dto: UpdatePopularExamDto) {
    const exam = await this.popularExamsService.update(id, dto);
    return new UpdatePopularExamResult(new PopularExamResult(exam));
  }

  @Delete(':id')
  @UseGuards(SystemAdminGuard)
  @DeletePopularExamSwagger()
  async delete(@Param('id') id: string) {
    await this.popularExamsService.softDelete(id);
    return new DeletePopularExamResult();
  }
}
