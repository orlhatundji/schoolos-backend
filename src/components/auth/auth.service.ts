import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User, UserType } from '@prisma/client';

import { BaseService } from '../../common/base-service';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordHasher } from '../../utils/hasher';
import { StudentsService } from '../students/students.service';
import { Student } from '../students/types';
import { TeachersService } from '../teachers/teachers.service';
import { Teacher } from '../teachers/types';
import { UsersService } from '../users/users.service';
import { LoginStudentDto } from './dto/login-student.dto';
import { LoginDto } from './dto/login.dto';
import { TokensService } from './modules/refresh-token/tokens.service';
import { AuthMessages } from './results';
import { JwtAuthService } from './strategies/jwt/jwt-auth.service';
import { AuthTokens } from './strategies/jwt/types';

@Injectable()
export class AuthService extends BaseService {
  constructor(
    private readonly hasher: PasswordHasher,
    private readonly userService: UsersService,
    private readonly studentService: StudentsService,
    private readonly teachersService: TeachersService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly tokenService: TokensService,
    private readonly prisma: PrismaService,
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

  async login(dto: LoginDto): Promise<{
    tokens: AuthTokens;
    user?: User;
    student?: Student;
    teacher?: Teacher;
    preferences?: any;
  }> {
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

    // Get school's color scheme (only for users with a school)
    let schoolColorScheme = 'default';
    if (user.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: user.schoolId },
        select: { colorScheme: true },
      });
      schoolColorScheme = school?.colorScheme || 'default';
    }

    // Fetch user preferences
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.prisma.userPreferences.create({
        data: {
          userId: user.id,
          themeMode: 'SYSTEM',
          colorSchemeType: 'SCHOOL',
          schoolColorScheme: schoolColorScheme,
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          inAppNotifications: true,
          marketingEmails: false,
        },
      });
    } else {
      // Always update school color scheme to reflect current school's color scheme
      if (preferences.schoolColorScheme !== schoolColorScheme) {
        preferences = await this.prisma.userPreferences.update({
          where: { userId: user.id },
          data: { schoolColorScheme: schoolColorScheme },
        });
      }
    }

    // Return appropriate data based on user type
    if (user.type === UserType.TEACHER) {
      const teacher = await this.teachersService.getTeacherByUserId(user.id);
      if (teacher) {
        return { tokens, teacher, preferences };
        return { tokens, teacher, preferences };
      }
    } else if (user.type === UserType.STUDENT) {
      const student = await this.studentService.getStudentByUserId(user.id);
      if (student) {
        return { tokens, student, preferences };
        return { tokens, student, preferences };
      }
    }

    // Fallback to regular user data
    return { tokens, user, preferences };
    return { tokens, user, preferences };
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
