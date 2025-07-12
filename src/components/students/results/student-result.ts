import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../users/results';
import { BaseResultWithData, ResultOptions } from '../../../common/results';
import { Student } from '../types';

export class StudentEntity extends UserEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentNo: string;

  @ApiProperty()
  classArmId: string;

  @ApiProperty()
  guardianId?: string;

  @ApiProperty()
  admissionNo?: string;

  @ApiProperty()
  admissionDate: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  public static fromStudent(student: Student): StudentEntity {
    const user = UserEntity.from(student.user);
    const studentEntity = new StudentEntity();
    studentEntity.id = student.id;
    studentEntity.studentNo = student.studentNo;
    studentEntity.classArmId = student.classArmId;
    studentEntity.guardianId = student.guardianId;
    studentEntity.admissionNo = student.admissionNo;
    studentEntity.admissionDate = student.admissionDate;
    studentEntity.createdAt = student.createdAt;
    studentEntity.updatedAt = student.updatedAt;

    return Object.assign(studentEntity, user);
  }

  public static fromStudentsArray(students: Student[]): StudentEntity[] {
    return students.map((student) => this.fromStudent(student));
  }
}

export class StudentResult extends BaseResultWithData<StudentEntity> {
  @ApiProperty({ type: () => StudentEntity })
  public data: StudentEntity;

  public static from(student: Student, options: ResultOptions): StudentResult {
    const studentEntity = StudentEntity.fromStudent(student);
    return new StudentResult(options.status, options.message, studentEntity);
  }
}
