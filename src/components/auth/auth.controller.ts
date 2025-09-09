import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators';
import { LoginDto } from './dto/login.dto';
import { AuthMessages, AuthResult } from './results';
import { LoginStudentDto } from './dto/login-student.dto';

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
    const { tokens, user, student, teacher } = await this.authService.login(loginDto);

    return AuthResult.from({
      user,
      student,
      teacher,
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
    description: AuthMessages.SUCCESS.AUTHENTICATED,
  })
  @ApiUnauthorizedResponse({
    description: AuthMessages.FAILURE.ACCESS_DENIED,
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
