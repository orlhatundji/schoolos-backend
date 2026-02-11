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
      gender: 'MALE',
      school: { connect: { id: schoolId } },
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
  const student = await prisma.student.create({
    data: {
      user: { connect: { id: userId } },
      studentNo,
      admissionDate: faker.getAdmissionDate(),
      admissionNo: faker.getAdmissionNo(),
      ...(guardianId ? { guardian: { connect: { id: guardianId } } } : {}),
    },
  });

  // Create ClassArmStudent relationship
  const classArm = await prisma.classArm.findUniqueOrThrow({
    where: { id: classArmId },
    select: { academicSessionId: true },
  });
  await prisma.classArmStudent.create({
    data: {
      student: { connect: { id: student.id } },
      classArm: { connect: { id: classArmId } },
      academicSession: { connect: { id: classArm.academicSessionId } },
      isActive: true,
    },
  });

  return student;
}

export async function generateGuardian(userId: string) {
  return prisma.guardian.create({
    data: { userId },
  });
}

export async function generateLevel(schoolId: string, name = 'SS1') {
  // Get the next order value for this school
  const maxOrder = await prisma.level.findFirst({
    where: { schoolId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  const nextOrder = (maxOrder?.order || 0) + 1;

  return prisma.level.create({
    data: {
      name,
      code: `LVL-${name}-${Date.now()}`,
      school: { connect: { id: schoolId } },
      order: nextOrder,
    },
  });
}

export async function generateDepartment(schoolId: string, name = 'Science') {
  return prisma.department.create({
    data: { name, code: `DEPT-${name}-${Date.now()}`, school: { connect: { id: schoolId } } },
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
      slug: `${name.toLowerCase()}-${academicSessionId.slice(-8)}`,
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
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      academicSession: { connect: { id: academicSessionId } },
    },
  });
}

export async function generateSubject(schoolId: string, departmentId: string) {
  return prisma.subject.create({
    data: {
      name: faker.getSubjectName(),
      school: { connect: { id: schoolId } },
      department: { connect: { id: departmentId } },
    },
  });
}

export async function generateClassArmSubject(classArmId: string, subjectId: string) {
  return prisma.classArmSubject.upsert({
    where: {
      classArmId_subjectId: { classArmId, subjectId },
    },
    create: { classArmId, subjectId },
    update: {},
  });
}

export async function generateAssessments(
  classArmSubjectId: string,
  studentId: string,
  termId: string,
) {
  const names = [faker.getAssessmentName(), faker.getAssessmentName()] as const;

  const assessments = await Promise.all(
    names.map((name) =>
      prisma.classArmStudentAssessment.create({
        data: {
          classArmSubjectId,
          studentId,
          termId,
          name,
          score: faker.getScore(),
          isExam: false,
          maxScore: 100,
        },
      }),
    ),
  );

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
  classArmSubjectId: string,
) {
  return prisma.classArmSubjectTeacher.create({
    data: {
      teacher: { connect: { id: teacherId } },
      classArmSubject: { connect: { id: classArmSubjectId } },
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
  const classArmSubject = await generateClassArmSubject(classArm.id, subject.id);

  const [classArmTeacher, classArmSubjectTeacher, academicSessionCalendar] = await Promise.all([
    generateClassArmTeacher(teacher.id, classArm.id),
    generateClassArmSubjectTeacher(teacher.id, classArmSubject.id),
    generateAcademicSessionCalendar(academicSession.id),
  ]);

  const assessments = await generateAssessments(classArmSubject.id, student.id, term.id);

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
    classArmSubject,
    assessments,
    classArmTeacher,
    classArmSubjectTeacher,
    academicSessionCalendar,
  };
}
