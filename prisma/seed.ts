import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { UserTypes } from '../src/components/users/constants';
import { CounterService } from '../src/common/counter';
import { getNextUserEntityNoFormatted } from '../src/utils/misc';

const prisma = new PrismaClient();
const counterService = new CounterService(prisma);

async function main() {
  const samplePassword = 'Dev@1234Test';

  const school = await prisma.school.create({
    data: {
      name: 'Bright Future High School',
      address: '12 Unity Street, Lagos',
      code: 'BFH',
    },
  });

  // Create super admin user + admin
  const adminUser = await prisma.user.create({
    data: {
      type: UserTypes.SUPER_ADMIN,
      email: 'olusola.samuel.oluwatobi@gmail.com',
      password: bcrypt.hashSync(samplePassword, 10),
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '08012345678',
      schoolId: school.id,
    },
  });

  await prisma.admin.create({
    data: {
      userId: adminUser.id,
      isSuper: true,
    },
  });

  const departments = await Promise.all(
    ['Science', 'Arts', 'Commercial'].map((name) =>
      prisma.department.create({ data: { name, schoolId: school.id } }),
    ),
  );

  const levels = await Promise.all(
    ['SS1', 'SS2', 'SS3'].map((name) =>
      prisma.level.create({ data: { name, schoolId: school.id } }),
    ),
  );

  const classArms = [];
  for (const level of levels) {
    for (const arm of ['A', 'B']) {
      const dept = faker.helpers.arrayElement(departments);
      const classArm = await prisma.classArm.create({
        data: {
          name: arm,
          levelId: level.id,
          departmentId: dept.id,
        },
      });
      classArms.push(classArm);
    }
  }

  // Teachers
  const teachers = await Promise.all(
    Array.from({ length: 5 }).map(async (_, i) => {
      const teacherUser = await prisma.user.create({
        data: {
          type: UserTypes.TEACHER,
          email: `teacher${i + 1}@brightfuture.edu.ng`,
          password: bcrypt.hashSync(samplePassword, 10),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          phone: faker.phone.number({ style: 'international' }),
          schoolId: school.id,
        },
      });

      const nextTeacherSeq = await counterService.getNextSequenceNo(UserTypes.TEACHER, school.id);
      const teacherNo = getNextUserEntityNoFormatted(
        UserTypes.TEACHER,
        school.code,
        new Date(),
        nextTeacherSeq,
      );

      return prisma.teacher.create({
        data: {
          userId: teacherUser.id,
          teacherNo,
        },
      });
    }),
  );

  // Subjects + Curriculum
  const subjects = [];
  for (const dept of departments) {
    for (let i = 0; i < 3; i++) {
      const name = `${faker.word.adjective()} ${faker.word.noun()}`;
      const subject = await prisma.subject.create({
        data: {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          isElective: faker.datatype.boolean(),
          schoolId: school.id,
          departmentId: dept.id,
        },
      });
      subjects.push(subject);

      await prisma.curriculum.create({
        data: {
          subjectId: subject.id,
          items: {
            create: Array.from({ length: 3 }).map(() => ({
              title: faker.word.words({ count: { min: 2, max: 5 } }),
            })),
          },
        },
      });
    }
  }

  // Assign class teachers
  for (const classArm of classArms) {
    await prisma.classArmTeacher.create({
      data: {
        classArmId: classArm.id,
        teacherId: faker.helpers.arrayElement(teachers).id,
      },
    });
  }

  // Students
  const students: any[] = [];
  let studentCounter = 0;

  await Promise.all(
    classArms.map(async (classArm) => {
      const studentsPerArm = await Promise.all(
        Array.from({ length: 5 }).map(async (_, i) => {
          const studentUser = await prisma.user.create({
            data: {
              type: UserTypes.STUDENT,
              email: `student${studentCounter++}@brightfuture.edu.ng`,
              password: bcrypt.hashSync(samplePassword, 10),
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              phone: faker.phone.number({ style: 'international' }),
              schoolId: school.id,
            },
          });

          const nextStudentSeq = await counterService.getNextSequenceNo(
            UserTypes.STUDENT,
            school.id,
          );

          const admissionNo = faker.string.alphanumeric(7);
          const admissionDate = faker.date.past();
          const studentNo = getNextUserEntityNoFormatted(
            UserTypes.STUDENT,
            school.code,
            admissionDate,
            nextStudentSeq,
          );

          const student = await prisma.student.create({
            data: {
              userId: studentUser.id,
              studentNo,
              admissionDate,
              admissionNo,
              classArmId: classArm.id,
            },
          });

          if (i === 0) {
            await prisma.prefect.create({
              data: {
                studentId: student.id,
                role: 'Health Prefect',
              },
            });
          }

          return student;
        }),
      );

      students.push(...studentsPerArm);
    }),
  );

  // Academic Sessions & Terms
  const sessions = await Promise.all(
    ['2023/2024', '2024/2025'].map((academicYear) =>
      prisma.academicSession.create({
        data: {
          academicYear,
          schoolId: school.id,
          isCurrent: academicYear === '2023/2024',
          startDate: faker.date.past(),
          endDate: faker.date.future(),
        },
      }),
    ),
  );

  const terms = [];
  for (const session of sessions) {
    for (const name of ['First Term', 'Second Term', 'Third Term']) {
      const term = await prisma.term.create({
        data: {
          name,
          academicSessionId: session.id,
        },
      });
      terms.push(term);
    }

    await prisma.academicSessionCalendar.create({
      data: {
        academicSessionId: session.id,
        items: {
          create: [
            { title: 'Resumption', date: faker.date.past() },
            { title: 'Midterm Break', date: faker.date.recent() },
            { title: 'End of Term', date: faker.date.future() },
          ],
        },
      },
    });
  }

  // Subject → Teacher → ClassArm assignments
  for (const subject of subjects) {
    for (const classArm of classArms) {
      await prisma.classArmSubjectTeacher.create({
        data: {
          subjectId: subject.id,
          classArmId: classArm.id,
          teacherId: faker.helpers.arrayElement(teachers).id,
        },
      });
    }
  }

  // Attendance
  const recentSession = sessions.at(-1)!;
  const recentTerm = terms.filter((t) => t.academicSessionId === recentSession.id).at(-1)!;

  for (const student of students) {
    const presentDays = faker.number.int({ min: 5, max: 10 });
    for (let i = 0; i < presentDays; i++) {
      await prisma.studentAttendance.create({
        data: {
          studentId: student.id,
          classArmId: student.classArmId!,
          academicSessionId: recentSession.id,
          termId: recentTerm.id,
          date: faker.date.recent({ days: 30 }),
          status: faker.helpers.arrayElement(['PRESENT', 'ABSENT', 'LATE']),
        },
      });
    }
  }

  // Subject assessments
  for (const student of students) {
    for (const subject of subjects) {
      const subjectTermStudent = await prisma.subjectTermStudent.create({
        data: {
          studentId: student.id,
          subjectId: subject.id,
          academicSessionId: recentSession.id,
          termId: recentTerm.id,
          totalScore: 0,
        },
      });

      const assessments = [
        { name: 'PRACTICAL ', score: faker.number.int({ min: 5, max: 20 }), isExam: false },
        { name: 'MID TERM TEST', score: faker.number.int({ min: 10, max: 30 }), isExam: false },
        { name: 'FINAL EXAMINATION', score: faker.number.int({ min: 30, max: 60 }), isExam: true },
      ];

      const created = await Promise.all(
        assessments.map((a) =>
          prisma.subjectTermStudentAssessment.create({
            data: {
              name: a.name,
              score: a.score,
              isExam: a.isExam,
              subjectTermStudentId: subjectTermStudent.id,
            },
          }),
        ),
      );

      const totalScore = created.reduce((sum, a) => sum + a.score, 0);
      await prisma.subjectTermStudent.update({
        where: { id: subjectTermStudent.id },
        data: { totalScore },
      });
    }
  }

  console.log('✅ School seed data generated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
