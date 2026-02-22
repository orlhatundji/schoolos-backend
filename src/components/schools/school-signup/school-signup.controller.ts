import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { SchoolSignupService } from './school-signup.service';
import { CreateSchoolSignupDto } from './dto';
import { SchoolSignupResult, SchoolSignupMessages } from './results';
import { Public } from '../../../common/decorators';

@Controller('school-signup')
@ApiTags('School Signup')
export class SchoolSignupController {
  constructor(private readonly schoolSignupService: SchoolSignupService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a school signup request' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: SchoolSignupResult,
    description: SchoolSignupMessages.SUCCESS.SIGNUP_REQUEST_CREATED,
  })
  async createSignupRequest(@Body() createSchoolSignupDto: CreateSchoolSignupDto) {
    const signupRequest = await this.schoolSignupService.createSignupRequest(createSchoolSignupDto);

    return SchoolSignupResult.from(signupRequest, {
      status: HttpStatus.CREATED,
      message: SchoolSignupMessages.SUCCESS.SIGNUP_REQUEST_CREATED,
    });
  }
}
