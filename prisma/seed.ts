import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { UserTypes } from '../src/components/users/constants';
import { CounterService } from '../src/common/counter';
import { getNextUserEntityNoFormatted } from '../src/utils/misc';
import { PasswordHasher } from '../src/utils/hasher';

const prisma = new PrismaClient();
const passwordHasher = new PasswordHasher();
const counterService = new CounterService(prisma);

async function main() {
  console.log('🚀 Starting seed process...');
  const samplePassword = 'Password@123';

  console.log('Checking if system admin already exists...');
  const existingSystemAdmin = await prisma.systemAdmin.findFirst({
    where: {
      user: {
        email: 'platform.admin@example.com',
      },
    },
  });

  if (existingSystemAdmin) {
    console.log('System admin already exists:', {
      id: existingSystemAdmin.id,
      email: 'platform.admin@example.com',
      password: samplePassword,
      role: existingSystemAdmin.role,
    });

    // Check if school and students already exist
    const existingSchool = await prisma.school.findFirst();
    const studentCount = await prisma.student.count();

    if (existingSchool && studentCount > 0) {
      console.log(`School and ${studentCount} students already exist. Seed completed.`);
      return;
    }

    console.log('School or students missing. Continuing with seed...');
  } else {
    // Create a system admin user
    console.log('Creating system admin user...');
    const hashedPassword = await passwordHasher.hash(samplePassword);

    const systemAdminUser = await prisma.user.create({
      data: {
        type: UserTypes.SYSTEM_ADMIN,
        email: 'platform.admin@example.com',
        phone: '+1234567890',
        password: hashedPassword,
        firstName: 'Platform',
        lastName: 'Admin',
        gender: 'MALE',
      },
    });

    // Create system admin record
    const systemAdmin = await prisma.systemAdmin.create({
      data: {
        userId: systemAdminUser.id,
        role: 'PLATFORM_ADMIN',
      },
    });

    console.log('System admin created:', {
      id: systemAdmin.id,
      email: systemAdminUser.email,
      password: samplePassword, // Plain text for reference
      role: systemAdmin.role,
    });
  }

  console.log('Getting or creating school...');
  let school = await prisma.school.findFirst();

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'Bright Future High School',
        code: 'BFH',
      },
    });
    console.log('School created:', school.name);
  } else {
    console.log('School already exists:', school.name);
  }

  console.log('Creating super admin user...');
  // Check if super admin already exists
  let adminUser = await prisma.user.findUnique({
    where: { email: 'orlhatundji@gmail.com' },
  });

  if (!adminUser) {
    // Create super admin user + admin
    adminUser = await prisma.user.create({
      data: {
        type: UserTypes.SUPER_ADMIN,
        email: 'orlhatundji@gmail.com',
        password: bcrypt.hashSync(samplePassword, 10),
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '09130649019',
        schoolId: school.id,
        gender: 'FEMALE',
      },
    });

    await prisma.admin.create({
      data: {
        userId: adminUser.id,
        isSuper: true,
      },
    });
    console.log('Super admin created');
  } else {
    console.log('Super admin already exists');
  }

  console.log('Creating departments...');
  const departments = await Promise.all(
    [
      { name: 'Science', code: 'SCI' },
      { name: 'Arts', code: 'ART' },
      { name: 'Commercial', code: 'COM' },
    ].map((dept) =>
      prisma.department.create({ data: { name: dept.name, code: dept.code, schoolId: school.id } }),
    ),
  );

  console.log('Creating levels...');
  const levels = await Promise.all(
    [
      { name: 'JSS1', code: 'JSS1' },
      { name: 'JSS2', code: 'JSS2' },
      { name: 'JSS3', code: 'JSS3' },
      { name: 'SS1', code: 'SS1' },
      { name: 'SS2', code: 'SS2' },
      { name: 'SS3', code: 'SS3' },
    ].map((level) =>
      prisma.level.create({ data: { name: level.name, code: level.code, schoolId: school.id } }),
    ),
  );

  console.log('Creating academic sessions and terms...');
  // Academic Sessions & Terms
  const sessions = await Promise.all(
    ['2023/2024', '2024/2025'].map((academicYear) =>
      prisma.academicSession.create({
        data: {
          academicYear,
          schoolId: school.id,
          isCurrent: academicYear === '2024/2025',
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
            { title: 'Resumption', startDate: faker.date.past() },
            { title: 'Midterm Break', startDate: faker.date.recent() },
            { title: 'End of Term', startDate: faker.date.future() },
          ],
        },
      },
    });
  }

  console.log('Creating class arms...');
  const classArms = [];
  for (const level of levels) {
    for (const arm of ['A', 'B', 'C']) {
      const dept = faker.helpers.arrayElement(departments);
      const classArm = await prisma.classArm.create({
        data: {
          name: arm,
          levelId: level.id,
          departmentId: dept.id,
          schoolId: school.id,
          academicSessionId: faker.helpers.arrayElement(sessions).id,
        },
      });
      classArms.push(classArm);
    }
  }

  console.log('Creating teachers...');
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
          gender: faker.person.sex() === 'male' ? 'MALE' : 'FEMALE',
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

  console.log('Creating subjects and curricula...');
  // Subjects + Curriculum
  const subjects = [];
  const subjectTerms = [];
  for (const dept of departments) {
    for (let i = 0; i < 3; i++) {
      const name = `${faker.word.adjective()} ${faker.word.noun()}`;
      const subject = await prisma.subject.create({
        data: {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          category: faker.helpers.arrayElement(['CORE', 'GENERAL', 'VOCATIONAL']),
          schoolId: school.id,
          departmentId: dept.id,
        },
      });
      subjects.push(subject);
    }
  }

  for (const subject of subjects) {
    for (const term of terms) {
      const subjectTerm = await prisma.subjectTerm.create({
        data: {
          subject: { connect: { id: subject.id } },
          academicSession: { connect: { id: term.academicSessionId } },
          term: { connect: { id: term.id } },
          curriculum: {
            create: {
              items: {
                create: Array.from({ length: 3 }).map(() => ({
                  title: faker.word.words({ count: { min: 2, max: 5 } }),
                })),
              },
            },
          },
        },
      });
      subjectTerms.push(subjectTerm);
    }
  }

  console.log('Assigning class teachers...');
  // Assign class teachers with direct references
  for (const classArm of classArms) {
    const selectedTeacher = faker.helpers.arrayElement(teachers);

    // Create the junction record (for backward compatibility)
    await prisma.classArmTeacher.create({
      data: {
        classArmId: classArm.id,
        teacherId: selectedTeacher.id,
      },
    });

    // Update the classArm with direct reference
    await prisma.classArm.update({
      where: { id: classArm.id },
      data: { classTeacherId: selectedTeacher.id },
    });
  }

  console.log('Creating students...');
  // Students
  const students: any[] = [];

  // Nigerian states for state of origin
  const nigerianStates = [
    'Lagos',
    'Kano',
    'Rivers',
    'Kaduna',
    'Oyo',
    'Imo',
    'Borno',
    'Osun',
    'Delta',
    'Ondo',
    'Anambra',
    'Taraba',
    'Katsina',
    'Cross River',
    'Niger',
    'Akwa Ibom',
    'Jigawa',
    'Enugu',
    'Kebbi',
    'Sokoto',
    'Adamawa',
    'Plateau',
    'Kogi',
    'Bauchi',
    'Kwara',
    'Eboyi',
    'Abia',
    'Edo',
    'Yobe',
    'Zamfara',
    'Nasarawa',
    'Gombe',
    'Ekiti',
    'Bayelsa',
    'Abuja FCT',
  ];

  let studentCounter = 0;

  // Process classrooms sequentially to avoid database overload
  for (const classArm of classArms) {
    console.log(`Creating students for ${classArm.name}...`);
    const studentsPerArm = await Promise.all(
      Array.from({ length: 25 }).map(async (_, i) => {
        const studentUser = await prisma.user.create({
          data: {
            type: UserTypes.STUDENT,
            email: `student${studentCounter++}@brightfuture.edu.ng`,
            password: bcrypt.hashSync(samplePassword, 10),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number({ style: 'international' }),
            schoolId: school.id,
            gender: faker.person.sex() === 'male' ? 'MALE' : 'FEMALE',
            dateOfBirth: faker.date.birthdate({ min: 12, max: 18, mode: 'age' }), // Students aged 12-18
            stateOfOrigin: faker.helpers.arrayElement(nigerianStates), // Random Nigerian state
          },
        });

        const nextStudentSeq = await counterService.getNextSequenceNo(UserTypes.STUDENT, school.id);

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

        // Create address for the student
        const studentAddress = await prisma.address.create({
          data: {
            country: 'Nigeria',
            state: faker.location.state(),
            city: faker.location.city(),
            street1: faker.location.streetAddress(),
            street2: faker.location.secondaryAddress(),
            zip: faker.location.zipCode(),
          },
        });

        // Update student user with address
        await prisma.user.update({
          where: { id: studentUser.id },
          data: { addressId: studentAddress.id },
        });

        // Create guardian for the student
        const guardianUser = await prisma.user.create({
          data: {
            type: UserTypes.GUARDIAN,
            email: `guardian_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`, // Unique guardian email
            password: bcrypt.hashSync(samplePassword, 10),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phone: faker.phone.number({ style: 'international' }),
            schoolId: school.id,
            gender: faker.person.sex() === 'male' ? 'MALE' : 'FEMALE',
            dateOfBirth: faker.date.birthdate({ min: 30, max: 60, mode: 'age' }), // Guardians aged 30-60
            stateOfOrigin: faker.helpers.arrayElement(nigerianStates), // Random Nigerian state
          },
        });

        const guardian = await prisma.guardian.create({
          data: {
            userId: guardianUser.id,
          },
        });

        // Link student to guardian
        await prisma.student.update({
          where: { id: student.id },
          data: { guardianId: guardian.id },
        });

        if (i === 0) {
          await prisma.prefect.create({
            data: {
              studentId: student.id,
              role: 'Health Prefect',
            },
          });

          // Update the classArm with direct captain reference
          await prisma.classArm.update({
            where: { id: classArm.id },
            data: { captainId: student.id },
          });
        }

        return student;
      }),
    );

    students.push(...studentsPerArm);
  }

  console.log('Assigning subject teachers to class arms...');
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

  console.log('Recording student attendance...');
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

  console.log('Creating subject assessments for students...');
  // Subject assessments
  for (const student of students) {
    for (const subjectTerm of subjectTerms) {
      const subjectTermStudent = await prisma.subjectTermStudent.create({
        data: {
          student: { connect: { id: student.id } },
          subjectTerm: { connect: { id: subjectTerm.id } },
          totalScore: 0,
        },
      });

      const assessments = [
        {
          name: 'PRACTICAL',
          score: faker.number.int({ min: 5, max: 20 }),
          isExam: false,
        },
        {
          name: 'MID TERM TEST',
          score: faker.number.int({ min: 10, max: 30 }),
          isExam: false,
        },
        {
          name: 'FINAL EXAMINATION',
          score: faker.number.int({ min: 30, max: 60 }),
          isExam: true,
        },
      ];

      const created = await Promise.all(
        assessments.map((a) =>
          prisma.subjectTermStudentAssessment.create({
            data: {
              name: a.name,
              score: a.score,
              isExam: a.isExam,
              subjectTermStudent: { connect: { id: subjectTermStudent.id } },
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
