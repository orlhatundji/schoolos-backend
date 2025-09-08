import { TeacherSubjectInfo } from '../types';

export class TeacherSubjectsResult {
  subjects: {
    id: string;
    name: string;
    department: string;
    classesCount: number;
    totalStudents: number;
    averageScore?: number;
  }[];

  constructor(subjects: TeacherSubjectInfo[]) {
    this.subjects = subjects;
  }
}
