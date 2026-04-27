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
  CreateQuizAssignmentDto,
  GrantOverrideDto,
  QuizAssignmentQueryDto,
  UpdateQuizAssignmentDto,
} from './dto';
import { QuizAssignmentsService } from './quiz-assignments.service';
import {
  CreateQuizAssignmentSwagger,
  DeleteQuizAssignmentSwagger,
  GetAssignmentResultsSwagger,
  GetQuizAssignmentSwagger,
  GrantOverrideSwagger,
  ListStudentAssignmentsSwagger,
  ListTeacherAssignmentsSwagger,
  MonitorAssignmentSwagger,
  ReleaseResultsSwagger,
  UpdateQuizAssignmentSwagger,
} from './quiz-assignments.swagger';
import {
  CreateQuizAssignmentResult,
  DeleteQuizAssignmentResult,
  GrantOverrideResult,
  QuizAssignmentMonitorResult,
  QuizAssignmentResult,
  QuizAssignmentResultsResult,
  QuizAssignmentsListResult,
  ReleaseResultsResult,
  StudentMonitorRowResult,
  StudentResultRowResult,
  UpdateQuizAssignmentResult,
} from './results/quiz-assignment.result';

@Controller('quiz-assignments')
@ApiTags('Quiz Assignments')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class QuizAssignmentsController {
  constructor(private readonly service: QuizAssignmentsService) {}

  @Post()
  @CreateQuizAssignmentSwagger()
  async create(@GetCurrentUserId() userId: string, @Body() dto: CreateQuizAssignmentDto) {
    const a = await this.service.create(userId, dto);
    return new CreateQuizAssignmentResult(new QuizAssignmentResult(a));
  }

  @Get()
  @ListTeacherAssignmentsSwagger()
  async listForTeacher(
    @GetCurrentUserId() userId: string,
    @Query() query: QuizAssignmentQueryDto,
  ) {
    const { items, total, page, limit } = await this.service.listForTeacher(userId, query);
    return new QuizAssignmentsListResult(
      items.map((a) => new QuizAssignmentResult(a)),
      total,
      page,
      limit,
    );
  }

  @Get('mine')
  @ListStudentAssignmentsSwagger()
  async listForStudent(
    @GetCurrentUserId() userId: string,
    @Query() query: QuizAssignmentQueryDto,
  ) {
    const { items, total, page, limit } = await this.service.listForStudent(userId, query);
    return new QuizAssignmentsListResult(
      items.map((a) => new QuizAssignmentResult(a)),
      total,
      page,
      limit,
    );
  }

  @Get(':id')
  @GetQuizAssignmentSwagger()
  async findById(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const a = await this.findVisibleToCaller(userId, id);
    return new QuizAssignmentResult(a);
  }

  @Patch(':id')
  @UpdateQuizAssignmentSwagger()
  async update(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuizAssignmentDto,
  ) {
    const a = await this.service.update(userId, id, dto);
    return new UpdateQuizAssignmentResult(new QuizAssignmentResult(a));
  }

  @Delete(':id')
  @DeleteQuizAssignmentSwagger()
  async delete(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    await this.service.softDelete(userId, id);
    return new DeleteQuizAssignmentResult();
  }

  @Post(':id/overrides')
  @HttpCode(HttpStatus.CREATED)
  @GrantOverrideSwagger()
  async grantOverride(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: GrantOverrideDto,
  ) {
    const o = await this.service.grantOverride(userId, id, dto);
    return new GrantOverrideResult(o);
  }

  @Post(':id/release-results')
  @HttpCode(HttpStatus.OK)
  @ReleaseResultsSwagger()
  async releaseResults(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const releasedAt = await this.service.releaseResults(userId, id);
    return new ReleaseResultsResult(releasedAt);
  }

  @Get(':id/monitor')
  @MonitorAssignmentSwagger()
  async monitor(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const { assignment, students } = await this.service.getMonitor(userId, id);
    const rows = students.map(
      ({ student, attempts }) => new StudentMonitorRowResult(student, attempts),
    );
    return new QuizAssignmentMonitorResult(new QuizAssignmentResult(assignment), rows);
  }

  @Get(':id/results')
  @GetAssignmentResultsSwagger()
  async results(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const { assignment, attempts } = await this.service.getResults(userId, id);
    const rows = attempts.map((a) => new StudentResultRowResult(a, a.student));
    return new QuizAssignmentResultsResult(new QuizAssignmentResult(assignment), rows);
  }

  /**
   * GET :id is visible to either the managing teacher or an enrolled student.
   * Try teacher path first; on Forbidden/NotFound, fall back to student path.
   */
  private async findVisibleToCaller(userId: string, id: string) {
    try {
      return await this.service.findByIdForTeacher(userId, id);
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name !== 'ForbiddenException' && name !== 'NotFoundException') throw err;
      return this.service.findByIdForStudent(userId, id);
    }
  }
}
