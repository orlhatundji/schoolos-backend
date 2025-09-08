import { TeacherProfile } from '../types';

export class TeacherProfileResult {
  teacherNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  status: string;
  employmentType: string;
  qualification: string;
  joinDate: string;
  avatar?: string;

  constructor(data: TeacherProfile) {
    this.teacherNo = data.teacherNo;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email;
    this.phone = data.phone;
    this.department = data.department;
    this.status = data.status;
    this.employmentType = data.employmentType;
    this.qualification = data.qualification;
    this.joinDate = data.joinDate;
    this.avatar = data.avatar;
  }
}
