import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { GetCurrentUserId } from '../../../common/decorators';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards';
import {
  ImportWordQuestionsFormDto,
  ImportWordQuizFormDto,
  parseImportWordQuestionsForm,
  parseImportWordQuizForm,
} from './dto/import-word-quiz.dto';
import { QuestionWordTemplateService } from './question-word-template.service';
import { QuestionsImportService } from './questions-import.service';
import { ImportWordQuestionsResult, ImportWordQuizResult } from './results/import-word-quiz.result';

@Controller('questions/import')
@ApiTags('Question Import')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class QuestionsImportController {
  constructor(
    private readonly questionsImportService: QuestionsImportService,
    private readonly templateService: QuestionWordTemplateService,
  ) {}

  @Post('word-questions')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import a Word .docx file into published questions without creating a quiz',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportWordQuestionsFormDto })
  @ApiResponse({ status: 201, type: ImportWordQuestionsResult })
  @ApiResponse({ status: 400, description: 'Invalid file, invalid template format, or validation errors' })
  async importWordQuestions(
    @GetCurrentUserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, unknown>,
  ) {
    try {
      return await this.questionsImportService.importWordQuestions(
        userId,
        file,
        parseImportWordQuestionsForm(body),
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON in multipart form fields');
      }
      throw error;
    }
  }

  @Post('word-quiz')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import a Word .docx file into a new draft quiz with published questions',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ImportWordQuizFormDto })
  @ApiResponse({ status: 201, type: ImportWordQuizResult })
  @ApiResponse({ status: 400, description: 'Invalid file, invalid template format, or validation errors' })
  async importWordQuiz(
    @GetCurrentUserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, unknown>,
  ) {
    try {
      return await this.questionsImportService.importWordQuiz(
        userId,
        file,
        parseImportWordQuizForm(body),
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON in multipart form fields');
      }
      throw error;
    }
  }

  @Get('word-template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  @ApiOperation({ summary: 'Download the official Word question upload template' })
  @ApiResponse({
    status: 200,
    description: 'Word .docx question template',
    content: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  downloadTemplate(@Res() res: Response) {
    const template = this.templateService.generateTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="schoolos-question-upload-template.docx"',
    );
    res.setHeader('Content-Length', template.length);
    res.send(template);
  }
}
