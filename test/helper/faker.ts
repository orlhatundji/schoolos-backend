import { faker } from '@faker-js/faker';
import { IFaker } from './faker.interface';

export class Faker implements IFaker {
  getSchoolName(): string {
    return faker.company.name();
  }

  getEmail(): string {
    return faker.internet.email().toLowerCase();
  }

  getFirstName(): string {
    return faker.person.firstName();
  }

  getLastName(): string {
    return faker.person.lastName();
  }

  getPhoneNumber(): string {
    return faker.phone.number({ style: 'international' });
  }

  getDOB(): string {
    return faker.date.birthdate({ min: 10, max: 18, mode: 'age' }).toISOString();
  }

  getURL(): string {
    return faker.internet.url();
  }

  getAddress(): string {
    return faker.location.streetAddress();
  }

  getStrongPassword(): string {
    return faker.internet.password({
      length: 16,
      prefix: 'S3cure_',
      memorable: false,
    });
  }

  getWeakPassword(): string {
    return '123456';
  }

  getUUID(): string {
    return faker.string.uuid();
  }

  getProgramName(): string {
    return `${faker.word.adjective()} ${faker.word.noun()} Program`;
  }

  getTermName(): string {
    return faker.helpers.arrayElement(['First Term', 'Second Term', 'Third Term']);
  }

  getDepartmentName(): string {
    return faker.helpers.arrayElement(['Science', 'Arts', 'Commercial']);
  }

  getSchoolCode(): string {
    return `SCH-${faker.string.alphanumeric(4).toUpperCase()}`;
  }

  getStudentNo(schoolCode = 'SCH'): string {
    return `${schoolCode}-STD${faker.string.numeric(5)}`;
  }

  getTeacherNo(schoolCode = 'SCH'): string {
    return `${schoolCode}-TCH${faker.string.numeric(4)}`;
  }

  getSubjectName(): string {
    return `${faker.word.adjective()} ${faker.word.noun()}`.replace(/^\w/, (c) => c.toUpperCase());
  }

  getSessionYearRange(): [number, number] {
    const start = faker.number.int({ min: 2020, max: 2030 });
    return [start, start + 1];
  }

  getAcademicYear(): string {
    const [start, end] = this.getSessionYearRange();
    return `${start}/${end}`;
  }

  getBoolean(): boolean {
    return faker.datatype.boolean();
  }

  getAssessmentName(): string {
    return `${faker.word.words(2)}`;
  }

  getScore(): number {
    return faker.number.int({ min: 10, max: 40 });
  }

  getCurriculumTopic(): string {
    return faker.word.words({ count: { min: 2, max: 5 } });
  }

  getPastDate(): Date {
    return faker.date.past();
  }

  getRecentDate(): Date {
    return faker.date.recent();
  }

  getFutureDate(): Date {
    return faker.date.future();
  }

  getAdmissionNo(): string {
    return `${faker.string.alphanumeric(7)}`;
  }

  getAdmissionDate(): Date {
    return faker.date.past();
  }
}
