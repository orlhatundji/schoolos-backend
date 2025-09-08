import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User, UserType } from '@prisma/client';
import { BaseService } from '../../common/base-service';
import { UsersService } from '../users/users.service';
import { JwtAuthService } from './strategies/jwt/jwt-auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthMessages } from './results';
import { PasswordHasher } from '../../utils/hasher';
import { AuthTokens } from './strategies/jwt/types';
import { LoginStudentDto } from './dto/login-student.dto';
import { StudentsService } from '../students/students.service';
import { Student } from '../students/types';
import { TeachersService } from '../teachers/teachers.service';
import { Teacher } from '../teachers/types';
import { TokensService } from './modules/refresh-token/tokens.service';

@Injectable()
export class AuthService extends BaseService {
  constructor(
    private readonly hasher: PasswordHasher,
    private readonly userService: UsersService,
    private readonly studentService: StudentsService,
    private readonly teachersService: TeachersService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly tokenService: TokensService,
  ) {
    super(AuthService.name);
  }

  async loginStudent(dto: LoginStudentDto): Promise<{ tokens: AuthTokens; student: Student }> {
    const { studentNo, password } = dto;
    const student = await this.studentService.getStudentByStudentNo(studentNo);
    if (!student) {
      throw new UnauthorizedException(AuthMessages.FAILURE.ACCESS_DENIED);
    }

    if (student.user.mustUpdatePassword) {
      throw new UnauthorizedException('You must update your password before proceeding.');
    }

    const tokens: AuthTokens = await this._validate(password, student.user);

    // Update last login timestamp
    await this.userService.updateLastLoginAt(student.user.id);

    return { tokens, student };
  }

  async login(dto: LoginDto): Promise<{ tokens: AuthTokens; user?: User; student?: Student; teacher?: Teacher }> {
    const { email, password } = dto;
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException(AuthMessages.FAILURE.ACCESS_DENIED);
    }

    if (user.mustUpdatePassword) {
      throw new UnauthorizedException('You must update your password before proceeding.');
    }

    const tokens: AuthTokens = await this._validate(password, user);

    // Update last login timestamp
    await this.userService.updateLastLoginAt(user.id);

    // Return appropriate data based on user type
    if (user.type === UserType.TEACHER) {
      const teacher = await this.teachersService.getTeacherByUserId(user.id);
      if (teacher) {
        return { tokens, teacher };
      }
    } else if (user.type === UserType.STUDENT) {
      const student = await this.studentService.getStudentByUserId(user.id);
      if (student) {
        return { tokens, student };
      }
    }

    // Fallback to regular user data
    return { tokens, user };
  }

  private async _validate(password: string, user: User) {
    const isValidPassword = await this.hasher.compare(password, user.password);
    if (!isValidPassword) throw new UnauthorizedException(AuthMessages.FAILURE.ACCESS_DENIED);
    const tokens: AuthTokens = await this.jwtAuthService.getTokens(user);
    await this.tokenService.saveRefreshToken({
      token: tokens.refreshToken,
      userId: user.id,
    });
    return tokens;
  }
}
