import { User } from '@prisma/client';
import { BaseResultWithData } from '../../../common/results';
import { AuthTokens } from '../strategies/jwt/types';
import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { UserEntity } from '../../users/results';
import { StudentEntity } from '../../students/results';
import { Student } from '../../students/types';

interface IAuthResultInput {
  user?: User;
  student?: Student;
  tokens: AuthTokens;
  message: string;
  status: HttpStatus;
}

class AuthResultData {
  user?: UserEntity;
  student?: StudentEntity;
  tokens: AuthTokens;
}

export class AuthResult extends BaseResultWithData {
  @ApiProperty({ type: () => AuthResultData })
  public data: AuthResultData;

  public static from({ user, student, tokens, message, status }: IAuthResultInput): AuthResult {
    if (!user && !student) {
      throw new Error('User or student must be provided');
    }
    const data: AuthResultData = { tokens };
    if (student) {
      data.student = StudentEntity.fromStudent(student);
    } else {
      data.user = UserEntity.from(user);
    }

    return new AuthResult(status, message, data);
  }
}
