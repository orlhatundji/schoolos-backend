import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { BaseResultWithData } from '../../../common/results';
import { Student } from '../types';
import { StudentEntity } from './student-result';

export class ManyStudentsResult extends BaseResultWithData<StudentEntity[]> {
  @ApiProperty({ type: () => [StudentEntity] })
  public data: StudentEntity[];

  public static from(
    students: Student[],
    options: { message: string; status: HttpStatus },
  ): ManyStudentsResult {
    const studentEntities = StudentEntity.fromStudentsArray(students);
    return new ManyStudentsResult(options.status, options.message, studentEntities);
  }
}
