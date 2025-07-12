import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentMessages, StudentResult } from './results';
import { ApiBadRequestResponse, ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserMessages } from '../users/results';
import { CreateStudentDto, UpdateStudentDto } from './dto';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageStudentPolicyHandler } from './policies';
import { StrategyEnum } from '../auth/strategies';

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
