export interface IFaker {
  getSchoolName(): string;
  getEmail(): string;
  getFirstName(): string;
  getLastName(): string;
  getPhoneNumber(): string;
  getDOB(): string;
  getURL(): string;
  getAddress(): string;
  getStrongPassword(): string;
  getWeakPassword(): string;
  getUUID(): string;
  getProgramName(): string;
  getTermName(): string;
  getDepartmentName(): string;
  getSchoolCode(): string;
  getStudentNo(schoolCode?: string): string;
  getTeacherNo(schoolCode?: string): string;
  getSubjectName(): string;
  getSessionYearRange(): [number, number];
  getAcademicYear(): string;
}
