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
    admin?: { id: string; adminNo: string; isSuper: boolean };
    preferences?: any;
  }> {
    const { email, userNo, userType, password } = dto;
    let user: User | null = null;
    let student: Student | undefined;
    let teacher: Teacher | undefined;
    let admin: { id: string; adminNo: string; isSuper: boolean } | undefined;

    // Determine login method: email or userNo+userType
    if (email) {
      // Email-based login (for system/platform admins)
      user = await this.userService.findByEmail(email);
    } else if (userNo && userType) {
      // UserNo-based login (for students, teachers, admins)
      const result = await this._findUserByUserNo(userNo, userType);
      user = result.user;
      student = result.student;
      teacher = result.teacher;
      admin = result.admin;
    } else {
      throw new UnauthorizedException(AuthMessages.FAILURE.ACCESS_DENIED);
    }

    if (!user) {
      throw new UnauthorizedException(AuthMessages.FAILURE.ACCESS_DENIED);
    }

    if (user.mustUpdatePassword) {
      throw new UnauthorizedException('You must update your password before proceeding.');
    }

    const tokens: AuthTokens = await this._validate(password, user);

    // Update last login timestamp
    await this.userService.updateLastLoginAt(user.id);

    // Get school's color scheme
    let schoolColorScheme = 'default';
    if (user.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: user.schoolId },
        select: { colorScheme: true },
      });
      schoolColorScheme = school?.colorScheme || 'default';
    }

    // Fetch or create user preferences
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

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
    } else if (preferences.schoolColorScheme !== schoolColorScheme) {
      preferences = await this.prisma.userPreferences.update({
        where: { userId: user.id },
        data: { schoolColorScheme: schoolColorScheme },
      });
    }

    // For email-based login, fetch additional data based on user type
    if (email && !student && !teacher && !admin) {
      if (user.type === UserType.TEACHER) {
        teacher = (await this.teachersService.getTeacherByUserId(user.id)) || undefined;
      } else if (user.type === UserType.STUDENT) {
        student = (await this.studentService.getStudentByUserId(user.id)) || undefined;
      } else if (user.type === UserType.ADMIN || user.type === UserType.SUPER_ADMIN) {
        const adminData = await this.prisma.admin.findUnique({
          where: { userId: user.id },
        });
        if (adminData) {
          admin = {
            id: adminData.id,
            adminNo: adminData.adminNo,
            isSuper: adminData.isSuper,
          };
        }
      }
    }

    return {
      tokens,
      user,
      student,
      teacher,
      admin,
      preferences,
    };
  }

  private async _findUserByUserNo(
    userNo: string,
    userType: UserType,
  ): Promise<{
    user: User | null;
    student?: Student;
    teacher?: Teacher;
    admin?: { id: string; adminNo: string; isSuper: boolean };
  }> {
    switch (userType) {
      case UserType.STUDENT: {
        const studentData = await this.studentService.getStudentByStudentNo(userNo);
        if (studentData) {
          return { user: studentData.user, student: studentData };
        }
        return { user: null };
      }
      case UserType.TEACHER: {
        const teacherData = await this.teachersService.getTeacherByTeacherNo(userNo);
        if (teacherData) {
          return { user: teacherData.user, teacher: teacherData };
        }
        return { user: null };
      }
      case UserType.ADMIN:
      case UserType.SUPER_ADMIN: {
        const adminData = await this.prisma.admin.findUnique({
          where: { adminNo: userNo },
          include: {
            user: {
              include: {
                school: true,
              },
            },
          },
        });
        if (adminData) {
          return {
            user: adminData.user,
            admin: {
              id: adminData.id,
              adminNo: adminData.adminNo,
              isSuper: adminData.isSuper,
            },
          };
        }
        return { user: null };
      }
      default:
        return { user: null };
    }
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
