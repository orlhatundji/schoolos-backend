-- CreateEnum
CREATE TYPE "CommentTemplateType" AS ENUM ('TEACHER', 'PRINCIPAL');

-- CreateTable
CREATE TABLE "result_comments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "teacherComment" TEXT,
    "principalComment" TEXT,
    "teacher_comment_by_id" TEXT,
    "principal_comment_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "result_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_templates" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "CommentTemplateType" NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "result_comments_classArmId_termId_idx" ON "result_comments"("classArmId", "termId");

-- CreateIndex
CREATE UNIQUE INDEX "result_comments_studentId_classArmId_termId_key" ON "result_comments"("studentId", "classArmId", "termId");

-- CreateIndex
CREATE INDEX "comment_templates_schoolId_type_idx" ON "comment_templates"("schoolId", "type");

-- AddForeignKey
ALTER TABLE "result_comments" ADD CONSTRAINT "result_comments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_comments" ADD CONSTRAINT "result_comments_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_comments" ADD CONSTRAINT "result_comments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_comments" ADD CONSTRAINT "result_comments_teacher_comment_by_id_fkey" FOREIGN KEY ("teacher_comment_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_comments" ADD CONSTRAINT "result_comments_principal_comment_by_id_fkey" FOREIGN KEY ("principal_comment_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_templates" ADD CONSTRAINT "comment_templates_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_templates" ADD CONSTRAINT "comment_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
