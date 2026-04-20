import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards/access-token.guard';
import { CancelSchoolDeletionDto } from './dto/cancel-school-deletion.dto';
import { RequestSchoolDeletionDto } from './dto/request-school-deletion.dto';
import { SchoolDeletionService } from './services/school-deletion.service';

@Controller('schools/me/deletion-request')
@ApiTags('School Deletion (super-admin)')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
export class SchoolDeletionController {
  constructor(private readonly service: SchoolDeletionService) {}

  @Get()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current deletion request for the super-admin\'s school (if any)',
  })
  getCurrent(@GetCurrentUserId() userId: string) {
    return this.service.getCurrentForSchool(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Deletion request created',
  })
  request(
    @GetCurrentUserId() userId: string,
    @Body() dto: RequestSchoolDeletionDto,
  ) {
    return this.service.requestForCurrentSchool(userId, dto);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pending deletion request cancelled',
  })
  cancel(
    @GetCurrentUserId() userId: string,
    @Body() dto: CancelSchoolDeletionDto,
  ) {
    return this.service.cancelForCurrentSchool(userId, dto);
  }
}
