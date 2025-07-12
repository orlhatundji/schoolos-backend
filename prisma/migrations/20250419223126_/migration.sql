-- RenameForeignKey
ALTER TABLE "AcademicSessionCalendar" RENAME CONSTRAINT "AcademicSessionCalendar_sessionId_fkey" TO "AcademicSessionCalendar_academicSessionId_fkey";

-- RenameForeignKey
ALTER TABLE "StudentAttendance" RENAME CONSTRAINT "StudentAttendance_sessionId_fkey" TO "StudentAttendance_academicSessionId_fkey";

-- RenameForeignKey
ALTER TABLE "SubjectTermStudent" RENAME CONSTRAINT "SubjectTermStudent_sessionId_fkey" TO "SubjectTermStudent_academicSessionId_fkey";

-- RenameForeignKey
ALTER TABLE "Term" RENAME CONSTRAINT "Term_sessionId_fkey" TO "Term_academicSessionId_fkey";

-- RenameIndex
ALTER INDEX "AcademicSessionCalendar_sessionId_key" RENAME TO "AcademicSessionCalendar_academicSessionId_key";
