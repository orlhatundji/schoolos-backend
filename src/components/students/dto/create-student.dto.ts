import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateUserDto } from '../../users/dto';
import { Transform } from 'class-transformer';

export class CreateStudentDto extends CreateUserDto {
  @ApiProperty()
  @IsUUID()
  classArmId: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  guardianId?: string;

  @ApiProperty()
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  admissionDate?: Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  admissionNo?: string;
}
