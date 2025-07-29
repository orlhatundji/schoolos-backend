/*
  Warnings:

  - You are about to drop the `AcademicSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AcademicSessionCalendar` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AcademicSessionCalendarItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Address` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Assessment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClassArm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClassArmSubjectTeacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClassArmTeacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Counter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Curriculum` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CurriculumItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CurriculumItemRating` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GradingModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Guardian` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Hod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Level` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Prefect` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `School` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SchoolAddress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Student` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentAttendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubjectTerm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubjectTermStudent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubjectTermStudentAssessment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Teacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Term` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AcademicSession" DROP CONSTRAINT "AcademicSession_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "AcademicSessionCalendar" DROP CONSTRAINT "AcademicSessionCalendar_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "AcademicSessionCalendarItem" DROP CONSTRAINT "AcademicSessionCalendarItem_calendarId_fkey";

-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_userId_fkey";

-- DropForeignKey
ALTER TABLE "Assessment" DROP CONSTRAINT "Assessment_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "ClassArm" DROP CONSTRAINT "ClassArm_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "ClassArm" DROP CONSTRAINT "ClassArm_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "ClassArm" DROP CONSTRAINT "ClassArm_levelId_fkey";

-- DropForeignKey
ALTER TABLE "ClassArm" DROP CONSTRAINT "ClassArm_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "ClassArmSubjectTeacher" DROP CONSTRAINT "ClassArmSubjectTeacher_classArmId_fkey";

-- DropForeignKey
ALTER TABLE "ClassArmSubjectTeacher" DROP CONSTRAINT "ClassArmSubjectTeacher_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "ClassArmSubjectTeacher" DROP CONSTRAINT "ClassArmSubjectTeacher_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "ClassArmTeacher" DROP CONSTRAINT "ClassArmTeacher_classArmId_fkey";

-- DropForeignKey
ALTER TABLE "ClassArmTeacher" DROP CONSTRAINT "ClassArmTeacher_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "Counter" DROP CONSTRAINT "Counter_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "CurriculumItem" DROP CONSTRAINT "CurriculumItem_curriculumId_fkey";

-- DropForeignKey
ALTER TABLE "CurriculumItemRating" DROP CONSTRAINT "CurriculumItemRating_curriculumItemId_fkey";

-- DropForeignKey
ALTER TABLE "CurriculumItemRating" DROP CONSTRAINT "CurriculumItemRating_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "GradingModel" DROP CONSTRAINT "GradingModel_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Guardian" DROP CONSTRAINT "Guardian_userId_fkey";

-- DropForeignKey
ALTER TABLE "Hod" DROP CONSTRAINT "Hod_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Hod" DROP CONSTRAINT "Hod_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "Level" DROP CONSTRAINT "Level_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Prefect" DROP CONSTRAINT "Prefect_studentId_fkey";

-- DropForeignKey
ALTER TABLE "School" DROP CONSTRAINT "School_primaryAddressId_fkey";

-- DropForeignKey
ALTER TABLE "SchoolAddress" DROP CONSTRAINT "SchoolAddress_addressId_fkey";

-- DropForeignKey
ALTER TABLE "SchoolAddress" DROP CONSTRAINT "SchoolAddress_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_classArmId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_guardianId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_userId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAttendance" DROP CONSTRAINT "StudentAttendance_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAttendance" DROP CONSTRAINT "StudentAttendance_classArmId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAttendance" DROP CONSTRAINT "StudentAttendance_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAttendance" DROP CONSTRAINT "StudentAttendance_termId_fkey";

-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTerm" DROP CONSTRAINT "SubjectTerm_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTerm" DROP CONSTRAINT "SubjectTerm_curriculumId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTerm" DROP CONSTRAINT "SubjectTerm_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTerm" DROP CONSTRAINT "SubjectTerm_termId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTermStudent" DROP CONSTRAINT "SubjectTermStudent_studentId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTermStudent" DROP CONSTRAINT "SubjectTermStudent_subjectTermId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTermStudentAssessment" DROP CONSTRAINT "SubjectTermStudentAssessment_subjectTermStudentId_fkey";

-- DropForeignKey
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_userId_fkey";

-- DropForeignKey
ALTER TABLE "Term" DROP CONSTRAINT "Term_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_addressId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "UserToken" DROP CONSTRAINT "UserToken_userId_fkey";

-- DropTable
DROP TABLE "AcademicSession";

-- DropTable
DROP TABLE "AcademicSessionCalendar";

-- DropTable
DROP TABLE "AcademicSessionCalendarItem";

-- DropTable
DROP TABLE "Address";

-- DropTable
DROP TABLE "Admin";

-- DropTable
DROP TABLE "Assessment";

-- DropTable
DROP TABLE "ClassArm";

-- DropTable
DROP TABLE "ClassArmSubjectTeacher";

-- DropTable
DROP TABLE "ClassArmTeacher";

-- DropTable
DROP TABLE "Counter";

-- DropTable
DROP TABLE "Curriculum";

-- DropTable
DROP TABLE "CurriculumItem";

-- DropTable
DROP TABLE "CurriculumItemRating";

-- DropTable
DROP TABLE "Department";

-- DropTable
DROP TABLE "GradingModel";

-- DropTable
DROP TABLE "Guardian";

-- DropTable
DROP TABLE "Hod";

-- DropTable
DROP TABLE "Level";

-- DropTable
DROP TABLE "Prefect";

-- DropTable
DROP TABLE "School";

-- DropTable
DROP TABLE "SchoolAddress";

-- DropTable
DROP TABLE "Student";

-- DropTable
DROP TABLE "StudentAttendance";

-- DropTable
DROP TABLE "Subject";

-- DropTable
DROP TABLE "SubjectTerm";

-- DropTable
DROP TABLE "SubjectTermStudent";

-- DropTable
DROP TABLE "SubjectTermStudentAssessment";

-- DropTable
DROP TABLE "Teacher";

-- DropTable
DROP TABLE "Term";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "UserToken";

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "zip" TEXT,
    "geo" point,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_addresses" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "school_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "primaryAddressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_sessions" (
    "id" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "academic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_session_calendars" (
    "id" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "academic_session_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_session_calendar_items" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "academic_session_calendar_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hodId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_arms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "departmentId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "class_arms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "type" "UserType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "addressId" TEXT,
    "avatarUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "schoolId" TEXT NOT NULL,
    "mustUpdatePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tokens" (
    "id" TEXT NOT NULL,
    "type" "UserTokenType" NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isSuper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teacherNo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentNo" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "admissionNo" TEXT,
    "classArmId" TEXT NOT NULL,
    "guardianId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isElective" BOOLEAN NOT NULL DEFAULT false,
    "schoolId" TEXT NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_terms" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "curriculumId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subject_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculums" (
    "id" TEXT NOT NULL,
    "subjectTermId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "curriculums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "curriculum_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_item_ratings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "curriculumItemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "curriculum_item_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_term_students" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectTermId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subject_term_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_term_student_assessments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "isExam" BOOLEAN NOT NULL DEFAULT false,
    "subjectTermStudentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subject_term_student_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_models" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "model" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "grading_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_attendances" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "classArmId" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "student_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_arm_teachers" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "class_arm_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_arm_subject_teachers" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "class_arm_subject_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hods" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prefects" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prefects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_addresses_schoolId_addressId_key" ON "school_addresses"("schoolId", "addressId");

-- CreateIndex
CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code");

-- CreateIndex
CREATE UNIQUE INDEX "academic_session_calendars_academicSessionId_key" ON "academic_session_calendars"("academicSessionId");

-- CreateIndex
CREATE INDEX "departments_schoolId_idx" ON "departments"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "user_tokens_type_idx" ON "user_tokens"("type");

-- CreateIndex
CREATE UNIQUE INDEX "user_tokens_userId_type_key" ON "user_tokens"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_userId_key" ON "teachers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_teacherNo_key" ON "teachers"("teacherNo");

-- CreateIndex
CREATE UNIQUE INDEX "guardians_userId_key" ON "guardians"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentNo_key" ON "students"("studentNo");

-- CreateIndex
CREATE UNIQUE INDEX "students_admissionNo_key" ON "students"("admissionNo");

-- CreateIndex
CREATE UNIQUE INDEX "subject_terms_curriculumId_key" ON "subject_terms"("curriculumId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculums_subjectTermId_key" ON "curriculums"("subjectTermId");

-- CreateIndex
CREATE UNIQUE INDEX "grading_models_schoolId_key" ON "grading_models"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "student_attendances_studentId_date_key" ON "student_attendances"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "hods_teacherId_key" ON "hods"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "hods_departmentId_key" ON "hods"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "prefects_studentId_key" ON "prefects"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "counters_schoolId_entity_key" ON "counters"("schoolId", "entity");

-- AddForeignKey
ALTER TABLE "school_addresses" ADD CONSTRAINT "school_addresses_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_addresses" ADD CONSTRAINT "school_addresses_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_primaryAddressId_fkey" FOREIGN KEY ("primaryAddressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_sessions" ADD CONSTRAINT "academic_sessions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_session_calendars" ADD CONSTRAINT "academic_session_calendars_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_session_calendar_items" ADD CONSTRAINT "academic_session_calendar_items_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "academic_session_calendars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms" ADD CONSTRAINT "terms_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levels" ADD CONSTRAINT "levels_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arms" ADD CONSTRAINT "class_arms_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arms" ADD CONSTRAINT "class_arms_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arms" ADD CONSTRAINT "class_arms_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arms" ADD CONSTRAINT "class_arms_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_terms" ADD CONSTRAINT "subject_terms_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_terms" ADD CONSTRAINT "subject_terms_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_terms" ADD CONSTRAINT "subject_terms_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_terms" ADD CONSTRAINT "subject_terms_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curriculums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_items" ADD CONSTRAINT "curriculum_items_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curriculums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_item_ratings" ADD CONSTRAINT "curriculum_item_ratings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_item_ratings" ADD CONSTRAINT "curriculum_item_ratings_curriculumItemId_fkey" FOREIGN KEY ("curriculumItemId") REFERENCES "curriculum_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_term_students" ADD CONSTRAINT "subject_term_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_term_students" ADD CONSTRAINT "subject_term_students_subjectTermId_fkey" FOREIGN KEY ("subjectTermId") REFERENCES "subject_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_term_student_assessments" ADD CONSTRAINT "subject_term_student_assessments_subjectTermStudentId_fkey" FOREIGN KEY ("subjectTermStudentId") REFERENCES "subject_term_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_models" ADD CONSTRAINT "grading_models_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_teachers" ADD CONSTRAINT "class_arm_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_teachers" ADD CONSTRAINT "class_arm_teachers_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_subject_teachers" ADD CONSTRAINT "class_arm_subject_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_subject_teachers" ADD CONSTRAINT "class_arm_subject_teachers_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_subject_teachers" ADD CONSTRAINT "class_arm_subject_teachers_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hods" ADD CONSTRAINT "hods_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hods" ADD CONSTRAINT "hods_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prefects" ADD CONSTRAINT "prefects_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counters" ADD CONSTRAINT "counters_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
