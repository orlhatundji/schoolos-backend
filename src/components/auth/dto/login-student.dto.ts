import { IsString, MinLength } from 'class-validator';
import { BaseLoginDto } from './base-login.dto';

export class LoginStudentDto extends BaseLoginDto {
  @IsString()
  @MinLength(2)
  studentNo: string;
}
