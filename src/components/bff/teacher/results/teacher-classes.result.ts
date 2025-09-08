import { TeacherClassInfo } from '../types';

export class TeacherClassesResult {
  classes: {
    id: string;
    name: string;
    level: string;
    subject: string;
    studentsCount: number;
    nextClassTime?: string;
    location?: string;
    isClassTeacher: boolean;
  }[];

  constructor(classes: TeacherClassInfo[]) {
    this.classes = classes;
  }
}
