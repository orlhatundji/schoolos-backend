import * as bcrypt from 'bcrypt';

import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

import { CounterService } from '../src/common/counter';
import { ActivityLogService } from '../src/common/services/activity-log.service';
import { UserTypes } from '../src/components/users/constants';
import { PasswordHasher } from '../src/utils/hasher';
import { getNextUserEntityNoFormatted } from '../src/utils/misc';
import {
  getDefaultAssessmentStructure,
  getAssessmentStructureForSeeding,
} from '../src/utils/assessment-structure';

const prisma = new PrismaClient();
const passwordHasher = new PasswordHasher();
const counterService = new CounterService(prisma);
const activityLogService = new ActivityLogService(prisma);

// Helper function to log seed activities
async function logSeedActivity(
  userId: string,
  schoolId: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  details?: any,
) {
  try {
    await activityLogService.logActivity({
      userId,
      schoolId,
      action,
      entityType,
      entityId,
      description,
      details,
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script',
      requestId: `seed-${Date.now()}`,
      severity: 'INFO',
      category: 'SYSTEM',
    });
  } catch {
    // Activity logging failed - continue with seeding
  }
}

async function main() {
  console.log('🚀 Starting seed process...');
  const samplePassword = 'Password@123';

  // Variable to store system admin user ID for logging
  let systemAdminUserId: string;

  console.log('Checking if system admin already exists...');
  const existingSystemAdmin = await prisma.systemAdmin.findFirst({
    where: {
      user: {
        email: 'orlhatundji@gmail.com',
      },
    },
  });

  if (existingSystemAdmin) {
    console.log('System admin already exists:', {
      id: existingSystemAdmin.id,
      email: 'orlhatundji@gmail.com',
      password: samplePassword,
      role: existingSystemAdmin.role,
    });

    // Get existing system admin user ID
    const existingSystemAdminUser = await prisma.user.findFirst({
      where: {
        systemAdmin: { id: existingSystemAdmin.id },
      },
    });
    systemAdminUserId = existingSystemAdminUser!.id;

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
        email: 'orlhatundji@gmail.com',
        phone: '+1234567890',
        password: hashedPassword,
        firstName: 'Platform',
        lastName: 'Admin',
        gender: 'MALE',
      },
    });

    // Store system admin user ID for logging
    systemAdminUserId = systemAdminUser.id;

    // Create system admin record
    const systemAdmin = await prisma.systemAdmin.create({
      data: {
        userId: systemAdminUser.id,
        role: 'PLATFORM_ADMIN',
      },
    });

    // Log system admin creation
    await logSeedActivity(
      systemAdminUser.id,
      'system',
      'CREATE',
      'SystemAdmin',
      systemAdmin.id,
      'System admin created during seeding',
      { role: systemAdmin.role },
    );

    console.log('System admin created:', {
      id: systemAdmin.id,
      email: systemAdminUser.email,
      password: samplePassword, // Plain text for reference
      role: systemAdmin.role,
    });
  }

  console.log('Getting or creating school...');
  let school = await prisma.school.findFirst();

  // Declare category variables outside the if block
  let coreCategory, generalCategory, vocationalCategory;

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'Bright Future High School',
        code: 'BFH',
      },
    });

    // Create default categories
    console.log('Creating default categories...');
    coreCategory = await prisma.category.create({
      data: {
        name: 'Core',
        description: 'Essential subjects required for all students',
        isDefault: true,
        schoolId: school.id,
      },
    });

    generalCategory = await prisma.category.create({
      data: {
        name: 'General',
        description: 'General education subjects',
        isDefault: true,
        schoolId: school.id,
      },
    });

    vocationalCategory = await prisma.category.create({
      data: {
        name: 'Vocational',
        description: 'Skills-based and technical subjects',
        isDefault: true,
        schoolId: school.id,
      },
    });

    console.log('✅ Created default categories');

    // Log school creation
    await logSeedActivity(
      systemAdminUserId,
      school.id,
      'CREATE',
      'School',
      school.id,
      'School created during seeding',
      { name: school.name, code: school.code },
    );

    console.log('School created:', school.name);
  } else {
    console.log('School already exists:', school.name);

    // Get existing categories
    coreCategory = await prisma.category.findFirst({
      where: { schoolId: school.id, name: 'Core' },
    });
    generalCategory = await prisma.category.findFirst({
      where: { schoolId: school.id, name: 'General' },
    });
    vocationalCategory = await prisma.category.findFirst({
      where: { schoolId: school.id, name: 'Vocational' },
    });
  }

  console.log('Creating super admin user...');
  // Check if super admin already exists
  let adminUser = await prisma.user.findFirst({
    where: {
      email: 'admin@brightfuture.edu',
      schoolId: school.id,
    },
  });

  if (!adminUser) {
    // Create super admin user + admin
    adminUser = await prisma.user.create({
      data: {
        type: UserTypes.SUPER_ADMIN,
        email: 'admin@brightfuture.edu',
        password: bcrypt.hashSync(samplePassword, 10),
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '09130649019',
        schoolId: school.id,
        gender: 'FEMALE',
      },
    });

    // Generate adminNo for super admin
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const adminNo = `${school.code}/SA/${currentYear}/0001`;

    const superAdmin = await prisma.admin.create({
      data: {
        userId: adminUser.id,
        adminNo,
        isSuper: true,
      },
    });

    // Log super admin creation
    await logSeedActivity(
      adminUser.id,
      school.id,
      'CREATE',
      'Admin',
      superAdmin.id,
      'Super admin created during seeding',
      { isSuper: superAdmin.isSuper },
    );

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

  // Log department creation
  for (const dept of departments) {
    await logSeedActivity(
      adminUser.id,
      school.id,
      'CREATE',
      'Department',
      dept.id,
      'Department created during seeding',
      { name: dept.name, code: dept.code },
    );
  }

  console.log('Creating levels...');
  const levels = await Promise.all(
    [
      { name: 'JSS1', code: 'JSS1', order: 1 },
      { name: 'JSS2', code: 'JSS2', order: 2 },
      { name: 'JSS3', code: 'JSS3', order: 3 },
      { name: 'SS1', code: 'SS1', order: 4 },
      { name: 'SS2', code: 'SS2', order: 5 },
      { name: 'SS3', code: 'SS3', order: 6 },
    ].map((level) =>
      prisma.level.create({
        data: {
          name: level.name,
          code: level.code,
          schoolId: school.id,
          order: level.order,
        },
      }),
    ),
  );

  // Log level creation
  for (const level of levels) {
    await logSeedActivity(
      adminUser.id,
      school.id,
      'CREATE',
      'Level',
      level.id,
      'Level created during seeding',
      { name: level.name, code: level.code },
    );
  }

  console.log('Creating academic sessions and terms...');
  // Academic Sessions & Terms
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const currentAcademicYear = `${currentYear}/${nextYear}`;
  const previousAcademicYear = `${currentYear - 1}/${currentYear}`;

  const sessions = await Promise.all(
    [previousAcademicYear, currentAcademicYear].map((academicYear) =>
      prisma.academicSession.create({
        data: {
          academicYear,
          schoolId: school.id,
          startDate: faker.date.past(),
          endDate: faker.date.future(),
        },
      }),
    ),
  );

  // Track which session is "current" for seeding purposes
  const currentSeedSession = sessions.find((s) => s.academicYear === currentAcademicYear);

  const terms = [];
  for (const session of sessions) {
    for (const name of ['First Term', 'Second Term', 'Third Term']) {
      const term = await prisma.term.create({
        data: {
          name,
          academicSessionId: session.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          // First term of current session will be set as school.currentTermId below
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

  // Set the first term of the current session as the school's current term
  const currentTermForSeed = terms.find((t) => t.academicSessionId === currentSeedSession?.id);
  if (currentTermForSeed) {
    await prisma.school.update({
      where: { id: school.id },
      data: { currentTermId: currentTermForSeed.id },
    });
  }

  console.log('Creating class arms...');
  const classArms = [];
  const currentSessionForClassArms = currentSeedSession;
  for (const level of levels) {
    for (const arm of ['A', 'B', 'C']) {
      const dept = faker.helpers.arrayElement(departments);
      const classArm = await prisma.classArm.create({
        data: {
          name: arm,
          slug: `${level.name.toLowerCase()}-${arm.toLowerCase()}-${currentSessionForClassArms.academicYear.replace('/', '-')}`,
          levelId: level.id,
          departmentId: dept.id,
          schoolId: school.id,
          academicSessionId: currentSessionForClassArms.id, // Always use current session for class arms
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
  const classArmSubjects = [];

  // Define predictable subject names for easier testing
  const subjectNames = {
    Science: ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
    Arts: ['English Language', 'Literature', 'History', 'Geography'],
    Commercial: ['Economics', 'Accounting', 'Business Studies', 'Commerce'],
  };

  for (const dept of departments) {
    const deptSubjects = subjectNames[dept.name] || [
      `${dept.name} Subject 1`,
      `${dept.name} Subject 2`,
      `${dept.name} Subject 3`,
    ];

    for (const subjectName of deptSubjects) {
      const subject = await prisma.subject.create({
        data: {
          name: subjectName,
          categoryId:
            dept.name === 'Science'
              ? coreCategory.id
              : dept.name === 'Arts'
                ? generalCategory.id
                : vocationalCategory.id,
          schoolId: school.id,
          departmentId: dept.id,
        },
      });
      subjects.push(subject);
    }
  }

  for (const subject of subjects) {
    for (const classArm of classArms) {
      const classArmSubject = await prisma.classArmSubject.upsert({
        where: {
          classArmId_subjectId: {
            classArmId: classArm.id,
            subjectId: subject.id,
          },
        },
        create: {
          classArmId: classArm.id,
          subjectId: subject.id,
        },
        update: {},
      });
      classArmSubjects.push({ ...classArmSubject, classArmId: classArm.id, subjectId: subject.id });
    }
  }

  // Ensure current session is properly set
  // console.log('Ensuring current session is set...');
  // const year = new Date().getFullYear();
  // const nextYearValue = year + 1;
  // const targetAcademicYear = `${year}/${nextYearValue}`;

  // Current term is already set via school.currentTermId above

  // Then set the current year session as current
  // const targetSession = await prisma.academicSession.findFirst({
  //   where: {
  //     schoolId: school.id,
  //     academicYear: targetAcademicYear,
  //   },
  // });

  // if (targetSession) {
  //   await prisma.academicSession.update({
  //     where: { id: targetSession.id },
  //     data: { isCurrent: true },
  //   });
  //   console.log(`✅ Set current session to: ${targetAcademicYear}`);
  // } else {
  //   console.log(`⚠️  Current session ${targetAcademicYear} not found`);
  // }

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
      Array.from({ length: 2 }).map(async (_, i) => {
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
          },
        });

        // Create ClassArmStudent relationship
        await prisma.classArmStudent.create({
          data: {
            studentId: student.id,
            classArmId: classArm.id,
            academicSessionId: sessions[0].id,
            isActive: true,
            enrolledAt: new Date(),
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
      // Find or create the ClassArmSubject first
      const classArmSubject = await prisma.classArmSubject.upsert({
        where: {
          classArmId_subjectId: {
            classArmId: classArm.id,
            subjectId: subject.id,
          },
        },
        update: {},
        create: {
          classArmId: classArm.id,
          subjectId: subject.id,
        },
      });

      await prisma.classArmSubjectTeacher.create({
        data: {
          classArmSubjectId: classArmSubject.id,
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
    // Get the student's ClassArmStudent relationship
    const classArmStudent = await prisma.classArmStudent.findFirst({
      where: {
        studentId: student.id,
        academicSessionId: recentSession.id,
        isActive: true,
      },
    });

    if (!classArmStudent) continue;

    const presentDays = faker.number.int({ min: 5, max: 10 });
    for (let i = 0; i < presentDays; i++) {
      await prisma.studentAttendance.create({
        data: {
          classArmStudentId: classArmStudent.id,
          termId: recentTerm.id,
          date: faker.date.recent({ days: 30 }),
          status: faker.helpers.arrayElement(['PRESENT', 'ABSENT', 'LATE']),
        },
      });
    }
  }

  console.log('Creating subject assessments for students...');
  // Subject assessments - Create comprehensive data for all students and subjects
  const currentSession = currentSeedSession;
  const currentSessionTerms = terms.filter((t) => t.academicSessionId === currentSession?.id);

  // Create assessments for ALL students and ALL classArmSubjects
  const studentsForAssessments = students; // All students
  const classArmSubjectsForAssessments = classArmSubjects; // All classArmSubjects

  for (const student of studentsForAssessments) {
    // Find the class arm this student belongs to
    const studentClassArmStudent = await prisma.classArmStudent.findFirst({
      where: { studentId: student.id, isActive: true },
    });
    if (!studentClassArmStudent) continue;

    const studentClassArmId = studentClassArmStudent.classArmId;

    // Filter classArmSubjects to only those matching this student's class arm
    const relevantClassArmSubjects = classArmSubjectsForAssessments.filter(
      (cas) => cas.classArmId === studentClassArmId,
    );

    for (const classArmSubject of relevantClassArmSubjects) {
      for (const term of currentSessionTerms) {
        // Use default assessment structure: CA1, CA2, Exam
        const assessmentStructure = getAssessmentStructureForSeeding();
        const assessments = assessmentStructure.map((assessment) => ({
          name: assessment.name,
          score: faker.number.int(assessment.scoreRange),
          isExam: assessment.isExam,
          maxScore: assessment.isExam ? 60 : 20,
        }));

        await Promise.all(
          assessments.map((a) =>
            prisma.classArmStudentAssessment.create({
              data: {
                classArmSubjectId: classArmSubject.id,
                studentId: student.id,
                termId: term.id,
                name: a.name,
                score: a.score,
                isExam: a.isExam,
                maxScore: a.maxScore,
              },
            }),
          ),
        );
      }
    }
  }

  console.log(
    `✅ Created comprehensive assessments for ${studentsForAssessments.length} students across ${classArmSubjectsForAssessments.length} class-arm-subject combinations`,
  );
  console.log(
    `📊 Total assessment records created: ${studentsForAssessments.length * 12 * currentSessionTerms.length * 3} (3 assessments per student-subject-term combination: Test 1, Test 2, Exam)`,
  );

  console.log('Creating default assessment structure...');
  // Create default assessment structure for the school using utility
  const defaultAssessmentStructures = getDefaultAssessmentStructure();

  // Get the current academic session for the school via school.currentTermId
  const schoolWithCurrentTerm = await prisma.school.findUnique({
    where: { id: school.id },
    select: { currentTerm: { select: { academicSession: true } } },
  });
  const currentAcademicSession = schoolWithCurrentTerm?.currentTerm?.academicSession ?? null;

  if (!currentAcademicSession) {
    console.log('⚠️ No current academic session found, skipping assessment structure creation');
    return;
  }

  const { randomUUID } = await import('crypto');
  const assessmentsWithIds = defaultAssessmentStructures.map((s) => ({
    id: randomUUID(),
    name: s.name,
    description: s.description,
    maxScore: s.maxScore,
    isExam: s.isExam,
    order: s.order,
  }));

  await prisma.assessmentStructureTemplate.create({
    data: {
      schoolId: school.id,
      academicSessionId: currentAcademicSession.id,
      name: 'Standard Assessment Structure',
      description: 'Default assessment structure for all subjects',
      assessments: assessmentsWithIds as any,
      isActive: true,
    },
  });

  console.log(`✅ Created assessment structure template with ${assessmentsWithIds.length} assessment types`);

  console.log('Creating payment structures...');
  // Payment Structures
  const paymentStructures = [];

  // Create different types of payment structures
  const paymentStructureData = [
    {
      name: 'First Term Tuition Fee',
      description: 'Tuition fees for the first term of the academic session',
      amount: 50000,
      category: 'TUITION',
      frequency: 'ONCE_PER_TERM',
      academicSessionId: sessions[1].id, // Current session
      termId: terms.filter((t) => t.academicSessionId === sessions[1].id)[0].id, // First term
    },
    {
      name: 'Second Term Tuition Fee',
      description: 'Tuition fees for the second term of the academic session',
      amount: 50000,
      category: 'TUITION',
      frequency: 'ONCE_PER_TERM',
      academicSessionId: sessions[1].id, // Current session
      termId: terms.filter((t) => t.academicSessionId === sessions[1].id)[1].id, // Second term
    },
    {
      name: 'Third Term Tuition Fee',
      description: 'Tuition fees for the third term of the academic session',
      amount: 50000,
      category: 'TUITION',
      frequency: 'ONCE_PER_TERM',
      academicSessionId: sessions[1].id, // Current session
      termId: terms.filter((t) => t.academicSessionId === sessions[1].id)[2].id, // Third term
    },
    {
      name: 'Examination Fee',
      description: 'Examination fees for the academic session',
      amount: 15000,
      category: 'EXAMINATION',
      frequency: 'ONCE_PER_SESSION',
      academicSessionId: sessions[1].id, // Current session
    },
    {
      name: 'Library Fee',
      description: 'Library access and maintenance fees',
      amount: 5000,
      category: 'LIBRARY',
      frequency: 'ONCE_PER_SESSION',
      academicSessionId: sessions[1].id, // Current session
    },
    {
      name: 'Laboratory Fee',
      description: 'Science laboratory usage fees',
      amount: 8000,
      category: 'LABORATORY',
      frequency: 'ONCE_PER_SESSION',
      academicSessionId: sessions[1].id, // Current session
    },
    {
      name: 'Sports Fee',
      description: 'Sports and physical education fees',
      amount: 3000,
      category: 'SPORTS',
      frequency: 'ONCE_PER_SESSION',
      academicSessionId: sessions[1].id, // Current session
    },
    {
      name: 'Transport Fee',
      description: 'School transportation fees',
      amount: 25000,
      category: 'TRANSPORT',
      frequency: 'MONTHLY',
      academicSessionId: sessions[1].id, // Current session
    },
    {
      name: 'Uniform Fee',
      description: 'School uniform fees',
      amount: 12000,
      category: 'UNIFORM',
      frequency: 'ONCE_PER_SESSION',
      academicSessionId: sessions[1].id, // Current session
    },
    {
      name: 'Textbook Fee',
      description: 'Textbook and learning material fees',
      amount: 10000,
      category: 'TEXTBOOK',
      frequency: 'ONCE_PER_SESSION',
      academicSessionId: sessions[1].id, // Current session
    },
    {
      name: 'Excursion Fee',
      description: 'Educational excursion and field trip fees',
      amount: 8000,
      category: 'EXCURSION',
      frequency: 'CUSTOM',
      academicSessionId: sessions[1].id, // Current session
      dueDate: faker.date.future(),
    },
  ];

  for (const paymentData of paymentStructureData) {
    const paymentStructure = await prisma.paymentStructure.create({
      data: {
        name: paymentData.name,
        description: paymentData.description,
        amount: paymentData.amount,
        currency: 'NGN',
        category: paymentData.category as any,
        frequency: paymentData.frequency as any,
        school: { connect: { id: school.id } },
        ...(paymentData.academicSessionId && {
          academicSession: { connect: { id: paymentData.academicSessionId } },
        }),
        ...(paymentData.termId && { term: { connect: { id: paymentData.termId } } }),
        ...(paymentData.dueDate && { dueDate: paymentData.dueDate }),
        isActive: true,
      },
    });
    paymentStructures.push(paymentStructure);
  }

  console.log('Generating student payments...');
  // Generate student payments for each payment structure
  const studentPayments = [];

  for (const student of students.slice(0, 2)) {
    for (const paymentStructure of paymentStructures) {
      // Determine payment status randomly
      const statusOptions = ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'WAIVED'];
      const status = faker.helpers.arrayElement(statusOptions);

      // Calculate due date based on payment structure
      let dueDate = new Date();
      if (paymentStructure.termId) {
        // For term-based payments, set due date to end of term
        const term = terms.find((t) => t.id === paymentStructure.termId);
        if (term) {
          dueDate = faker.date.between({ from: term.createdAt, to: faker.date.future() });
        }
      } else if (paymentStructure.dueDate) {
        dueDate = paymentStructure.dueDate;
      } else {
        // For session-based payments, set due date within the session
        dueDate = faker.date.between({ from: new Date(), to: faker.date.future() });
      }

      // Calculate paid amount based on status
      let paidAmount = 0;
      let paidAt = null;

      if (status === 'PAID') {
        paidAmount = Number(paymentStructure.amount);
        paidAt = faker.date.between({ from: paymentStructure.createdAt, to: dueDate });
      } else if (status === 'PARTIAL') {
        paidAmount = faker.number.int({ min: 1000, max: Number(paymentStructure.amount) - 1000 });
        paidAt = faker.date.between({ from: paymentStructure.createdAt, to: dueDate });
      }

      // Add some overdue payments
      if (status === 'OVERDUE') {
        dueDate = faker.date.past();
      }

      const studentPayment = await prisma.studentPayment.create({
        data: {
          student: { connect: { id: student.id } },
          paymentStructure: { connect: { id: paymentStructure.id } },
          amount: paymentStructure.amount,
          currency: paymentStructure.currency,
          status: status as any,
          dueDate,
          paidAmount,
          paidAt,
          ...(status === 'WAIVED' && {
            waivedBy: adminUser.id,
            waivedAt: faker.date.between({ from: paymentStructure.createdAt, to: new Date() }),
            waiverReason: faker.helpers.arrayElement([
              'Financial hardship',
              'Academic excellence',
              'Special circumstances',
              'Scholarship recipient',
              'Staff discount',
            ]),
          }),
        },
      });

      studentPayments.push(studentPayment);
    }
  }

  console.log(`✅ Created ${paymentStructures.length} payment structures`);
  console.log(`✅ Generated ${studentPayments.length} student payments`);
  console.log('✅ School seed data generated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
