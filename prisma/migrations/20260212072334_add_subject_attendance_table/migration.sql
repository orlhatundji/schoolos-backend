-- CreateTable
CREATE TABLE "subject_attendances" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classArmStudentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subject_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_attendances_classArmStudentId_date_subjectId_key" ON "subject_attendances"("classArmStudentId", "date", "subjectId");

-- AddForeignKey
ALTER TABLE "subject_attendances" ADD CONSTRAINT "subject_attendances_classArmStudentId_fkey" FOREIGN KEY ("classArmStudentId") REFERENCES "class_arm_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_attendances" ADD CONSTRAINT "subject_attendances_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_attendances" ADD CONSTRAINT "subject_attendances_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
