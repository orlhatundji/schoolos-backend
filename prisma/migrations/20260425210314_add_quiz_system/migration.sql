-- CreateEnum
CREATE TYPE "QuestionOwnerType" AS ENUM ('SCHOS_CURATED', 'TEACHER_AUTHORED');

-- CreateEnum
CREATE TYPE "QuizOwnerType" AS ENUM ('SCHOS_CURATED', 'TEACHER_AUTHORED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE', 'NUMERIC', 'SHORT_ANSWER');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PartialCreditMode" AS ENUM ('NONE', 'PROPORTIONAL');

-- CreateEnum
CREATE TYPE "QuizDeliveryMode" AS ENUM ('OPEN_WINDOW', 'SYNC_START');

-- CreateEnum
CREATE TYPE "QuizAssignmentStatus" AS ENUM ('SCHEDULED', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuizOverrideType" AS ENUM ('RETRY', 'EXTEND_WINDOW', 'EXTRA_TIME');

-- CreateEnum
CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADING', 'GRADED');

-- CreateEnum
CREATE TYPE "AggregationMethod" AS ENUM ('SUM', 'AVERAGE', 'WEIGHTED', 'BEST_OF_N');

-- CreateEnum
CREATE TYPE "MissingAttemptPolicy" AS ENUM ('TREAT_AS_ZERO', 'EXCLUDE_FROM_DENOMINATOR');

-- CreateEnum
CREATE TYPE "QuizAggregationStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentTopicId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "canonicalSubjectName" TEXT NOT NULL,
    "canonicalLevelCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popular_exams" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "popular_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "ownerType" "QuestionOwnerType" NOT NULL,
    "schoolId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "subjectId" TEXT,
    "levelId" TEXT,
    "defaultTermId" TEXT,
    "type" "QuestionType" NOT NULL,
    "prompt" JSONB NOT NULL,
    "promptPlainText" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "explanation" JSONB,
    "weight" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    "difficulty" "QuestionDifficulty",
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceQuestionId" TEXT,
    "config" JSONB,
    "partialCreditMode" "PartialCreditMode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" JSONB NOT NULL,
    "labelPlainText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "mediaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_topics" (
    "questionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_topics_pkey" PRIMARY KEY ("questionId","topicId")
);

-- CreateTable
CREATE TABLE "question_popular_exams" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "popularExamId" TEXT NOT NULL,
    "examYear" INTEGER,
    "paperReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_popular_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "ownerType" "QuizOwnerType" NOT NULL,
    "schoolId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "subjectId" TEXT,
    "levelId" TEXT,
    "defaultTermId" TEXT,
    "status" "QuizStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedMinutes" INTEGER,
    "passMarkPercent" DECIMAL(5,2),
    "difficulty" "QuestionDifficulty",
    "defaultSettings" JSONB,
    "sourceQuizId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "weightOverride" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("quizId","questionId")
);

-- CreateTable
CREATE TABLE "quiz_topics" (
    "quizId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_topics_pkey" PRIMARY KEY ("quizId","topicId")
);

-- CreateTable
CREATE TABLE "quiz_assignments" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "quizVersion" INTEGER NOT NULL,
    "classArmSubjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "assignedByTeacherId" TEXT NOT NULL,
    "mode" "QuizDeliveryMode" NOT NULL,
    "windowOpensAt" TIMESTAMP(3) NOT NULL,
    "windowClosesAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "syncGracePeriodSeconds" INTEGER DEFAULT 60,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "showResultsImmediately" BOOLEAN,
    "showCorrectAnswers" BOOLEAN,
    "resultsReleasedAt" TIMESTAMP(3),
    "status" "QuizAssignmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempt_overrides" (
    "id" TEXT NOT NULL,
    "quizAssignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "grantedByTeacherId" TEXT NOT NULL,
    "type" "QuizOverrideType" NOT NULL,
    "extraAttempts" INTEGER,
    "extraMinutes" INTEGER,
    "newWindowClosesAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempt_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "quizAssignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "autoSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "status" "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" DECIMAL(10,2),
    "maxScore" DECIMAL(10,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "pageVisibilityEvents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_responses" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "responseJson" JSONB,
    "weight" DECIMAL(10,2) NOT NULL,
    "pointsAwarded" DECIMAL(10,2),
    "isCorrect" BOOLEAN,
    "autoGraded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_score_aggregations" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classArmSubjectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "assessmentTemplateEntryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aggregationMethod" "AggregationMethod" NOT NULL,
    "bestOfN" INTEGER,
    "rescaleToMaxScore" INTEGER NOT NULL,
    "missingAttemptPolicy" "MissingAttemptPolicy" NOT NULL DEFAULT 'TREAT_AS_ZERO',
    "status" "QuizAggregationStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "finalizedByTeacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_score_aggregations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_score_aggregation_items" (
    "id" TEXT NOT NULL,
    "aggregationId" TEXT NOT NULL,
    "quizAssignmentId" TEXT NOT NULL,
    "weight" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_score_aggregation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "topics_canonicalSubjectName_canonicalLevelCode_idx" ON "topics"("canonicalSubjectName", "canonicalLevelCode");

-- CreateIndex
CREATE INDEX "topics_parentTopicId_idx" ON "topics"("parentTopicId");

-- CreateIndex
CREATE UNIQUE INDEX "popular_exams_code_key" ON "popular_exams"("code");

-- CreateIndex
CREATE INDEX "questions_schoolId_authorUserId_status_idx" ON "questions"("schoolId", "authorUserId", "status");

-- CreateIndex
CREATE INDEX "questions_subjectId_levelId_idx" ON "questions"("subjectId", "levelId");

-- CreateIndex
CREATE INDEX "questions_ownerType_status_idx" ON "questions"("ownerType", "status");

-- CreateIndex
CREATE INDEX "question_options_questionId_idx" ON "question_options"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_questionId_order_key" ON "question_options"("questionId", "order");

-- CreateIndex
CREATE INDEX "question_topics_topicId_idx" ON "question_topics"("topicId");

-- CreateIndex
CREATE INDEX "question_popular_exams_popularExamId_examYear_idx" ON "question_popular_exams"("popularExamId", "examYear");

-- CreateIndex
CREATE UNIQUE INDEX "question_popular_exams_questionId_popularExamId_examYear_key" ON "question_popular_exams"("questionId", "popularExamId", "examYear");

-- CreateIndex
CREATE INDEX "quizzes_schoolId_authorUserId_status_idx" ON "quizzes"("schoolId", "authorUserId", "status");

-- CreateIndex
CREATE INDEX "quizzes_subjectId_levelId_idx" ON "quizzes"("subjectId", "levelId");

-- CreateIndex
CREATE INDEX "quizzes_ownerType_status_idx" ON "quizzes"("ownerType", "status");

-- CreateIndex
CREATE INDEX "quiz_questions_questionId_idx" ON "quiz_questions"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_questions_quizId_order_key" ON "quiz_questions"("quizId", "order");

-- CreateIndex
CREATE INDEX "quiz_topics_topicId_idx" ON "quiz_topics"("topicId");

-- CreateIndex
CREATE INDEX "quiz_assignments_classArmSubjectId_termId_status_idx" ON "quiz_assignments"("classArmSubjectId", "termId", "status");

-- CreateIndex
CREATE INDEX "quiz_assignments_windowOpensAt_windowClosesAt_idx" ON "quiz_assignments"("windowOpensAt", "windowClosesAt");

-- CreateIndex
CREATE INDEX "quiz_assignments_quizId_idx" ON "quiz_assignments"("quizId");

-- CreateIndex
CREATE INDEX "quiz_attempt_overrides_quizAssignmentId_studentId_idx" ON "quiz_attempt_overrides"("quizAssignmentId", "studentId");

-- CreateIndex
CREATE INDEX "quiz_attempt_overrides_studentId_idx" ON "quiz_attempt_overrides"("studentId");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizAssignmentId_status_idx" ON "quiz_attempts"("quizAssignmentId", "status");

-- CreateIndex
CREATE INDEX "quiz_attempts_studentId_status_idx" ON "quiz_attempts"("studentId", "status");

-- CreateIndex
CREATE INDEX "quiz_attempts_dueAt_status_idx" ON "quiz_attempts"("dueAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempts_quizAssignmentId_studentId_attemptNumber_key" ON "quiz_attempts"("quizAssignmentId", "studentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "question_responses_attemptId_idx" ON "question_responses"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "question_responses_attemptId_questionId_key" ON "question_responses"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "quiz_score_aggregations_schoolId_classArmSubjectId_termId_idx" ON "quiz_score_aggregations"("schoolId", "classArmSubjectId", "termId");

-- CreateIndex
CREATE INDEX "quiz_score_aggregations_assessmentTemplateEntryId_idx" ON "quiz_score_aggregations"("assessmentTemplateEntryId");

-- CreateIndex
CREATE INDEX "quiz_score_aggregation_items_quizAssignmentId_idx" ON "quiz_score_aggregation_items"("quizAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_score_aggregation_items_aggregationId_quizAssignmentId_key" ON "quiz_score_aggregation_items"("aggregationId", "quizAssignmentId");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_parentTopicId_fkey" FOREIGN KEY ("parentTopicId") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_defaultTermId_fkey" FOREIGN KEY ("defaultTermId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_popular_exams" ADD CONSTRAINT "question_popular_exams_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_popular_exams" ADD CONSTRAINT "question_popular_exams_popularExamId_fkey" FOREIGN KEY ("popularExamId") REFERENCES "popular_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_defaultTermId_fkey" FOREIGN KEY ("defaultTermId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_sourceQuizId_fkey" FOREIGN KEY ("sourceQuizId") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_topics" ADD CONSTRAINT "quiz_topics_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_topics" ADD CONSTRAINT "quiz_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_assignments" ADD CONSTRAINT "quiz_assignments_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_assignments" ADD CONSTRAINT "quiz_assignments_classArmSubjectId_fkey" FOREIGN KEY ("classArmSubjectId") REFERENCES "class_arm_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_assignments" ADD CONSTRAINT "quiz_assignments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_assignments" ADD CONSTRAINT "quiz_assignments_assignedByTeacherId_fkey" FOREIGN KEY ("assignedByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_overrides" ADD CONSTRAINT "quiz_attempt_overrides_quizAssignmentId_fkey" FOREIGN KEY ("quizAssignmentId") REFERENCES "quiz_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_overrides" ADD CONSTRAINT "quiz_attempt_overrides_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_overrides" ADD CONSTRAINT "quiz_attempt_overrides_grantedByTeacherId_fkey" FOREIGN KEY ("grantedByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizAssignmentId_fkey" FOREIGN KEY ("quizAssignmentId") REFERENCES "quiz_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_score_aggregations" ADD CONSTRAINT "quiz_score_aggregations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_score_aggregations" ADD CONSTRAINT "quiz_score_aggregations_classArmSubjectId_fkey" FOREIGN KEY ("classArmSubjectId") REFERENCES "class_arm_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_score_aggregations" ADD CONSTRAINT "quiz_score_aggregations_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_score_aggregations" ADD CONSTRAINT "quiz_score_aggregations_finalizedByTeacherId_fkey" FOREIGN KEY ("finalizedByTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_score_aggregation_items" ADD CONSTRAINT "quiz_score_aggregation_items_aggregationId_fkey" FOREIGN KEY ("aggregationId") REFERENCES "quiz_score_aggregations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_score_aggregation_items" ADD CONSTRAINT "quiz_score_aggregation_items_quizAssignmentId_fkey" FOREIGN KEY ("quizAssignmentId") REFERENCES "quiz_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
