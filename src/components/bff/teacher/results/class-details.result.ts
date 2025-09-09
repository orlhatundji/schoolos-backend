import { ClassDetails } from '../types';

export class ClassDetailsResult {
  class: {
    id: string;
    name: string;
    level: string;
    department?: string;
    classTeacher: {
      id: string;
      name: string;
      email: string;
    };
    captain?: {
      id: string;
      name: string;
      studentNo: string;
    };
    stats: {
      totalStudents: number;
      maleStudents: number;
      femaleStudents: number;
      averageAge: number;
      attendanceRate: number;
      averageScore: number;
    };
    recentActivities: {
      id: string;
      type: string;
      title: string;
      date: string;
    }[];
  };

  constructor(classDetails: ClassDetails) {
    this.class = classDetails;
  }
}
