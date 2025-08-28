import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { StrategyEnum } from '../auth/strategies';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { UserMessages } from '../users/results';
import { CreateStudentDto, UpdateStudentDto } from './dto';
import { ManageStudentPolicyHandler } from './policies';
import { StudentMessages, StudentResult } from './results';
import { StudentsService } from './students.service';

@Controller('students')
@ApiTags('Student')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(PoliciesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: StudentResult,
    description: StudentMessages.SUCCESS.STUDENT_CREATED_SUCCESSFULLY,
  })
  @ApiBadRequestResponse({
    description: UserMessages.FAILURE.USER_EXISTS,
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async create(@Body() createStudentDto: CreateStudentDto) {
    const student = await this.studentsService.create(createStudentDto);

    return StudentResult.from(student, {
      status: HttpStatus.CREATED,
      message: StudentMessages.SUCCESS.STUDENT_CREATED_SUCCESSFULLY,
    });
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
