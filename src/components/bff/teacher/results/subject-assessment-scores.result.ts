import { SubjectAssessmentScores } from '../types';

export class SubjectAssessmentScoresResult {
  subject: {
    subjectId: string;
    subjectName: string;
    teacher: {
      id: string;
      name: string;
    };
    students: {
      id: string;
      studentNo: string;
      fullName: string;
      gender: string;
      assessments: {
        id: string;
        name: string;
        score: number;
        maxScore: number;
        percentage: number;
        isExam: boolean;
        date: string;
      }[];
      totalScore: number;
      averageScore: number;
      grade?: string;
    }[];
    classStats: {
      totalStudents: number;
      averageScore: number;
      highestScore: number;
      lowestScore: number;
      passRate: number;
    };
  };

  constructor(subjectScores: SubjectAssessmentScores) {
    this.subject = subjectScores;
  }
}
