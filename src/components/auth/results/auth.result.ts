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

interface IAuthResultInput {
  user?: User;
  student?: Student;
  teacher?: Teacher;
  tokens: AuthTokens;
  message: string;
  status: HttpStatus;
}

class AuthResultData {
  user?: UserEntity;
  student?: StudentEntity;
  teacher?: TeacherEntity;
  tokens: AuthTokens;
}

export class AuthResult extends BaseResultWithData {
  @ApiProperty({ type: () => AuthResultData })
  public data: AuthResultData;

  public static from({
    user,
    student,
    teacher,
    tokens,
    message,
    status,
  }: IAuthResultInput): AuthResult {
    if (!user && !student && !teacher) {
      throw new Error('User, student, or teacher must be provided');
    }
    const data: AuthResultData = { tokens };
    if (student) {
      data.student = StudentEntity.fromStudent(student);
    } else if (teacher) {
      data.teacher = TeacherEntity.fromTeacher(teacher);
    } else {
      data.user = UserEntity.from(user);
    }

    return new AuthResult(status, message, data);
  }
}
