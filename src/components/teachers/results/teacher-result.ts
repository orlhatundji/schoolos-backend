import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../users/results';
import { BaseResultWithData, ResultOptions } from '../../../common/results';
import { Teacher } from '../types';

export class TeacherEntity extends UserEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  teacherNo: string;

  @ApiProperty()
  departmentId?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  employmentType: string;

  @ApiProperty()
  qualification?: string;

  @ApiProperty()
  joinDate: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  public static fromTeacher(teacher: Teacher): TeacherEntity {
    const user = UserEntity.from(teacher.user);
    const teacherEntity = new TeacherEntity();
    teacherEntity.id = teacher.id;
    teacherEntity.teacherNo = teacher.teacherNo;
    teacherEntity.departmentId = teacher.departmentId;
    teacherEntity.status = teacher.status;
    teacherEntity.employmentType = teacher.employmentType;
    teacherEntity.qualification = teacher.qualification;
    teacherEntity.joinDate = teacher.joinDate;
    teacherEntity.createdAt = teacher.createdAt;
    teacherEntity.updatedAt = teacher.updatedAt;

    return Object.assign(teacherEntity, user);
  }

  public static fromTeachersArray(teachers: Teacher[]): TeacherEntity[] {
    return teachers.map((teacher) => this.fromTeacher(teacher));
  }
}

export class TeacherResult extends BaseResultWithData<TeacherEntity> {
  @ApiProperty({ type: () => TeacherEntity })
  public data: TeacherEntity;

  public static from(teacher: Teacher, options: ResultOptions): TeacherResult {
    const teacherEntity = TeacherEntity.fromTeacher(teacher);
    return new TeacherResult(options.status, options.message, teacherEntity);
  }
}
