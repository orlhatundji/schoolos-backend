import { User } from '@prisma/client';
import { BaseResultWithData } from '../../../common/results';
import { AuthTokens } from '../strategies/jwt/types';
import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { UserEntity } from '../../users/results';
import { StudentEntity } from '../../students/results';
import { Student } from '../../students/types';
import { TeacherEntity } from '../../teachers/results';
import { Teacher } from '../../teachers/types';

interface AdminInfo {
  id: string;
  adminNo: string;
  isSuper: boolean;
}

interface IAuthResultInput {
  user?: User;
  student?: Student;
  teacher?: Teacher;
  admin?: AdminInfo;
  preferences?: any;
  tokens: AuthTokens;
  message: string;
  status: HttpStatus;
}

class AuthResultData {
  user?: UserEntity;
  student?: StudentEntity;
  teacher?: TeacherEntity;
  admin?: AdminInfo;
  preferences?: any;
  tokens: AuthTokens;
}

export class AuthResult extends BaseResultWithData {
  @ApiProperty({ type: () => AuthResultData })
  public data: AuthResultData;

  public static from({
    user,
    student,
    teacher,
    admin,
    preferences,
    tokens,
    message,
    status,
  }: IAuthResultInput): AuthResult {
    if (!user && !student && !teacher) {
      throw new Error('User, student, or teacher must be provided');
    }
    const data: AuthResultData = { tokens, preferences };
    if (student) {
      data.student = StudentEntity.fromStudent(student);
    } else if (teacher) {
      data.teacher = TeacherEntity.fromTeacher(teacher);
    } else {
      data.user = UserEntity.from(user);
    }

    if (admin) {
      data.admin = admin;
    }

    return new AuthResult(status, message, data);
  }
}
