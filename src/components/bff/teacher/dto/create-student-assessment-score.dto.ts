export class CreateStudentAssessmentScoreDto {
  studentId: string;
  subjectName: string;
  termName: string;
  assessmentName: string;
  score: number;
  isExam?: boolean;
}
