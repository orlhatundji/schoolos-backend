import { ApiProperty } from '@nestjs/swagger';

import { SingleTeacherDetails } from '../types';

export class TeacherAddressResult {
  @ApiProperty({ description: 'Street address line 1', nullable: true })
  street1: string | null;

  @ApiProperty({ description: 'Street address line 2', nullable: true })
  street2: string | null;

  @ApiProperty({ description: 'City', nullable: true })
  city: string | null;

  @ApiProperty({ description: 'State/Province', nullable: true })
  state: string | null;

  @ApiProperty({ description: 'Country', nullable: true })
  country: string | null;

  constructor(data: SingleTeacherDetails['address']) {
    this.street1 = data?.street1 || null;
    this.street2 = data?.street2 || null;
    this.city = data?.city || null;
    this.state = data?.state || null;
    this.country = data?.country || null;
  }
}

export class SingleTeacherDetailsResult {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

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

  @ApiProperty({ description: 'Date of birth (YYYY-MM-DD)', nullable: true })
  dateOfBirth: string | null;

  @ApiProperty({ description: 'Gender' })
  gender: string;

  @ApiProperty({ description: 'State of origin', nullable: true })
  stateOfOrigin: string | null;

  @ApiProperty({ type: TeacherAddressResult, nullable: true, description: 'Teacher address' })
  address: TeacherAddressResult | null;

  @ApiProperty({ description: 'Whether teacher is Head of Department' })
  isHOD: boolean;

  @ApiProperty({ description: 'Department where teacher is HOD', nullable: true })
  hodDepartment: string | null;

  @ApiProperty({ description: 'Total number of students taught' })
  totalStudents: number;

  @ApiProperty({ description: 'Average class size' })
  averageClassSize: number;

  constructor(data: SingleTeacherDetails) {
    this.success = true;
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
    this.dateOfBirth = data.dateOfBirth;
    this.gender = data.gender;
    this.stateOfOrigin = data.stateOfOrigin;
    this.address = data.address ? new TeacherAddressResult(data.address) : null;
    this.isHOD = data.isHOD;
    this.hodDepartment = data.hodDepartment;
    this.totalStudents = data.totalStudents;
    this.averageClassSize = data.averageClassSize;
  }
}
