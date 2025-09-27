import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { Public } from '../../common/decorators';
import { AuthService } from './auth.service';
import { LoginStudentDto } from './dto/login-student.dto';
import { LoginDto } from './dto/login.dto';
import { AuthMessages, AuthResult } from './results';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    type: AuthResult,
    description: AuthMessages.SUCCESS.AUTHENTICATED,
  })
  @ApiUnauthorizedResponse({
    description: AuthMessages.FAILURE.ACCESS_DENIED,
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResult> {
    const { tokens, user, student, teacher, preferences } = await this.authService.login(loginDto);

    return AuthResult.from({
      user,
      student,
      teacher,
      preferences,
      tokens,
      status: HttpStatus.OK,
      message: AuthMessages.SUCCESS.AUTHENTICATED,
    });
  }

  @Public()
  @Post('student/login') // Keeping the original route
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    type: AuthResult,
    description: 'Student successfully authenticated with tokens and school information',
    schema: {
      example: {
        status: 200,
        message: 'Successfully authenticated',
        data: {
          student: {
            id: 'uuid',
            studentNo: 'STU001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@school.com',
            school: {
              id: 'school-uuid',
              name: 'Saint James School',
              address: '123 School Street',
              phone: '+1234567890',
            },
            classArmId: 'class-arm-uuid',
            admissionNo: 'ADM001',
            admissionDate: '2023-09-01T00:00:00.000Z',
          },
          tokens: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Access denied - Invalid credentials or student must update password',
    schema: {
      example: {
        status: 401,
        message: 'Access denied',
      },
    },
  })
  async loginStudent(@Body() loginDto: LoginStudentDto): Promise<AuthResult> {
    const { tokens, student } = await this.authService.loginStudent(loginDto);

    return AuthResult.from({
      student,
      tokens,
      status: HttpStatus.OK,
      message: AuthMessages.SUCCESS.AUTHENTICATED,
    });
  }
}
