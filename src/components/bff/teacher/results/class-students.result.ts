import { ClassStudentInfo } from '../types';

export class ClassStudentsResult {
  students: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    gender: string;
    dateOfBirth?: string;
    stateOfOrigin?: string;
    guardianName?: string;
    guardianPhone?: string;
    guardianEmail?: string;
    admissionDate: string;
    status: string;
    avatarUrl?: string;
  }[];

  constructor(students: ClassStudentInfo[]) {
    this.students = students;
  }
}
