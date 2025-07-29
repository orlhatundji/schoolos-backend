import { PrismaClient, UserType } from '@prisma/client';
import { PasswordHasher } from '../../src/utils/hasher';
import { Faker } from './faker';
import { CounterService } from '../../src/common/counter';
import { getNextUserEntityNoFormatted } from '../../src/utils/misc';

const prisma = new PrismaClient();
const faker = new Faker();
const hasher = new PasswordHasher();
const counterService = new CounterService(prisma);

export async function generateSchool() {
  return prisma.school.create({
    data: {
      name: `${faker.getSchoolName()} High School`,
      code: faker.getSchoolCode(),
    },
  });
}

export async function generateUser(type: UserType, schoolId: string) {
  const rawPassword = faker.getStrongPassword();
  const hashedPassword = await hasher.hash(rawPassword);

  const user = await prisma.user.create({
    data: {
      type,
      firstName: faker.getFirstName(),
      lastName: faker.getLastName(),
      email: faker.getEmail(),
      phone: faker.getPhoneNumber(),
      password: hashedPassword,
      schoolId,
    },
  });

  return { user, rawPassword };
}

export async function generateSuperAdminUser(schoolId: string) {
  return generateUser('SUPER_ADMIN', schoolId);
}

export async function generateAdminUser(schoolId: string) {
  return generateUser('ADMIN', schoolId);
}

export async function generateTeacher(userId: string, schoolId: string) {
  const seq = await counterService.getNextSequenceNo(UserType.TEACHER, schoolId);
  const teacherNo = getNextUserEntityNoFormatted(UserType.TEACHER, schoolId, new Date(), seq);
  return prisma.teacher.create({
    data: {
      userId,
      teacherNo,
    },
  });
}

export async function generateStudent(
  userId: string,
  schoolId: string,
  classArmId: string,
  guardianId?: string,
) {
  const seq = await counterService.getNextSequenceNo(UserType.STUDENT, schoolId);
  const studentNo = getNextUserEntityNoFormatted(UserType.STUDENT, schoolId, new Date(), seq);
  return prisma.student.create({
    data: {
      userId,
      classArmId,
      guardianId,
      studentNo,
      admissionDate: faker.getAdmissionDate(),
      admissionNo: faker.getAdmissionNo(),
    },
  });
}

export async function generateGuardian(userId: string) {
  return prisma.guardian.create({
    data: { userId },
  });
}

export async function generateLevel(schoolId: string, name = 'SS1') {
  return prisma.level.create({
    data: {
      name,
      schoolId,
    },
  });
}

export async function generateDepartment(schoolId: string, name = 'Science') {
  return prisma.department.create({
    data: { name, schoolId },
  });
}

export async function generateClassArm(
  levelId: string,
  departmentId: string,
  schoolId: string,
  academicSessionId: string,
  name = 'A',
) {
  return prisma.classArm.create({
    data: {
      name,
      levelId,
      departmentId,
      schoolId,
      academicSessionId,
    },
  });
}

export async function generateAcademicSession(schoolId: string) {
  const [startYear, endYear] = faker.getSessionYearRange();
  return prisma.academicSession.create({
    data: {
      academicYear: `${startYear}/${endYear}`,
      startDate: new Date(`${startYear}-09-01`),
      endDate: new Date(`${endYear}-07-30`),
      schoolId,
      isCurrent: true,
    },
  });
}

export async function generateTerm(academicSessionId: string, name = faker.getTermName()) {
  return prisma.term.create({
    data: {
      name,
      academicSessionId,
    },
  });
}

export async function generateSubject(schoolId: string, departmentId: string, isElective = false) {
  return prisma.subject.create({
    data: {
      name: faker.getSubjectName(),
      isElective,
      schoolId,
      departmentId,
    },
  });
}

export async function generateSubjectTerm(
  subjectId: string,
  academicSessionId: string,
  termId: string,
) {
  return prisma.subjectTerm.create({
    data: {
      subject: { connect: { id: subjectId } },
      academicSession: { connect: { id: academicSessionId } },
      term: { connect: { id: termId } },
    },
  });
}

export async function generateSubjectTermStudent(studentId: string, subjectTermId: string) {
  return prisma.subjectTermStudent.create({
    data: {
      student: { connect: { id: studentId } },
      subjectTerm: { connect: { id: subjectTermId } },
      totalScore: 0,
    },
  });
}

export async function generateAssessments(subjectTermStudentId: string) {
  const names = [faker.getAssessmentName(), faker.getAssessmentName()] as const;

  const assessments = await Promise.all(
    names.map((name) =>
      prisma.subjectTermStudentAssessment.create({
        data: {
          name,
          score: faker.getScore(),
          isExam: false,
          subjectTermStudent: { connect: { id: subjectTermStudentId } },
        },
      }),
    ),
  );

  const totalScore = assessments.reduce((sum, a) => sum + a.score, 0);

  await prisma.subjectTermStudent.update({
    where: { id: subjectTermStudentId },
    data: { totalScore },
  });

  return assessments;
}

export async function generateAcademicSessionCalendar(academicSessionId: string) {
  return prisma.academicSessionCalendar.create({
    data: {
      academicSessionId,
      items: {
        create: [
          { title: 'Resumption', startDate: faker.getPastDate() },
          { title: 'Midterm Break', startDate: faker.getRecentDate() },
          { title: 'End of Term', startDate: faker.getFutureDate() },
        ],
      },
    },
  });
}

export async function generateClassArmTeacher(teacherId: string, classArmId: string) {
  return prisma.classArmTeacher.create({
    data: {
      teacherId,
      classArmId,
    },
  });
}

export async function generateClassArmSubjectTeacher(
  teacherId: string,
  subjectId: string,
  classArmId: string,
) {
  return prisma.classArmSubjectTeacher.create({
    data: {
      teacherId,
      subjectId,
      classArmId,
    },
  });
}

export async function generateCurriculum(subjectTermId: string) {
  return prisma.curriculum.create({
    data: {
      subjectTerm: { connect: { id: subjectTermId } },
      items: {
        create: Array.from({ length: 3 }).map(() => ({
          title: faker.getCurriculumTopic(),
        })),
      },
    },
  });
}

export async function generateCurriculumItem(curriculumId: string) {
  return prisma.curriculumItem.create({
    data: {
      curriculumId,
      title: faker.getCurriculumTopic(),
    },
  });
}

export async function generateFullSchoolSetup() {
  const school = await generateSchool();
  const level = await generateLevel(school.id);
  const academicSession = await generateAcademicSession(school.id);

  const [adminUser, superAdminUser, teacherUser, studentUser, guardianUser, department] =
    await Promise.all([
      generateAdminUser(school.id),
      generateSuperAdminUser(school.id),
      generateUser('TEACHER', school.id),
      generateUser('STUDENT', school.id),
      generateUser('GUARDIAN', school.id),
      generateDepartment(school.id),
    ]);

  const classArm = await generateClassArm(
    level.id,
    department.id,
    school.id,
    academicSession.id,
    'A',
  );

  const [term, guardian, teacher] = await Promise.all([
    generateTerm(academicSession.id),
    generateGuardian(guardianUser.user.id),
    generateTeacher(teacherUser.user.id, school.id),
  ]);

  const student = await generateStudent(studentUser.user.id, school.id, classArm.id, guardian.id);
  const subject = await generateSubject(school.id, department.id);
  const subjectTerm = await generateSubjectTerm(subject.id, academicSession.id, term.id);

  const [classArmTeacher, classArmSubjectTeacher, curriculum, academicSessionCalendar] =
    await Promise.all([
      generateClassArmTeacher(teacher.id, classArm.id),
      generateClassArmSubjectTeacher(teacher.id, subject.id, classArm.id),
      generateCurriculum(subjectTerm.id),
      generateAcademicSessionCalendar(academicSession.id),
    ]);

  const curriculumItem = await generateCurriculumItem(curriculum.id);
  const subjectTermStudent = await generateSubjectTermStudent(student.id, subjectTerm.id);
  const assessments = await generateAssessments(subjectTermStudent.id);

  return {
    school,
    level,
    adminUser,
    superAdminUser,
    teacherUser,
    studentUser,
    guardianUser,
    department,
    classArm,
    academicSession,
    term,
    guardian,
    teacher,
    student,
    subject,
    subjectTermStudent,
    assessments,
    classArmTeacher,
    classArmSubjectTeacher,
    curriculum,
    curriculumItem,
    academicSessionCalendar,
    subjectTerm,
  };
}
