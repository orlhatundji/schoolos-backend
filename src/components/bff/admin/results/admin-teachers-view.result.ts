import { ApiProperty } from '@nestjs/swagger';

import { TeachersViewData } from '../types';

export class TeacherStatsResult {
  @ApiProperty({ description: 'Total number of teachers' })
  totalTeachers: number;

  @ApiProperty({ description: 'Number of active teachers' })
  activeTeachers: number;

  @ApiProperty({ description: 'Number of inactive teachers' })
  inactiveTeachers: number;

  @ApiProperty({ description: 'Number of teachers on leave' })
  onLeaveTeachers: number;

  constructor(data: TeachersViewData['stats']) {
    this.totalTeachers = data.totalTeachers;
    this.activeTeachers = data.activeTeachers;
    this.inactiveTeachers = data.inactiveTeachers;
    this.onLeaveTeachers = data.onLeaveTeachers;
  }
}

export class TeacherInfoResult {
  @ApiProperty({ description: 'Teacher ID' })
  id: string;

  @ApiProperty({ description: 'Teacher first name' })
  firstName: string;

  @ApiProperty({ description: 'Teacher last name' })
  lastName: string;

  @ApiProperty({ description: 'Teacher email address' })
  email: string;

  @ApiProperty({ description: 'Teacher phone number' })
  phone: string;

  @ApiProperty({ description: 'Teacher department' })
  department: string;

  @ApiProperty({ description: 'Subjects taught by the teacher', type: [String] })
  subjects: string[];

  @ApiProperty({ description: 'Employment type', enum: ['full-time', 'part-time', 'contract'] })
  employment: 'full-time' | 'part-time' | 'contract';

  @ApiProperty({ description: 'Years of experience' })
  experience: number;

  @ApiProperty({ description: 'Teacher qualification' })
  qualification: string;

  @ApiProperty({ description: 'Date teacher joined (YYYY-MM-DD)' })
  joinDate: string;

  @ApiProperty({ description: 'Last login timestamp (ISO 8601) or null', nullable: true })
  lastLogin: string | null;

  @ApiProperty({ description: 'Teacher status', enum: ['active', 'inactive', 'on-leave'] })
  status: 'active' | 'inactive' | 'on-leave';

  @ApiProperty({ description: 'Classes assigned to teacher', type: [String] })
  classesAssigned: string[];

  @ApiProperty({ description: 'Teacher avatar URL', nullable: true })
  avatar: string | null;

  constructor(data: any) {
    this.id = data.id;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email;
    this.phone = data.phone;
    this.department = data.department;
    this.subjects = data.subjects;
    this.employment = data.employment;
    this.experience = data.experience;
    this.qualification = data.qualification;
    this.joinDate = data.joinDate;
    this.lastLogin = data.lastLogin;
    this.status = data.status;
    this.classesAssigned = data.classesAssigned;
    this.avatar = data.avatar;
  }
}

export class AdminTeachersViewResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ type: TeacherStatsResult, description: 'Teacher statistics' })
  stats: TeacherStatsResult;

  @ApiProperty({ type: [TeacherInfoResult], description: 'List of teachers' })
  teachers: TeacherInfoResult[];

  constructor(data: TeachersViewData) {
    this.success = true;
    this.stats = new TeacherStatsResult(data.stats);
    this.teachers = data.teachers.map((teacher) => new TeacherInfoResult(teacher));
  }
}
