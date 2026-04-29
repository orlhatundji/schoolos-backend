-- CreateTable
CREATE TABLE "equation_library_items" (
    "id" TEXT NOT NULL,
    "canonicalSubjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "latex" TEXT NOT NULL,
    "tags" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equation_library_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equation_library_items_canonicalSubjectId_isActive_order_idx" ON "equation_library_items"("canonicalSubjectId", "isActive", "order");

-- CreateIndex
CREATE INDEX "equation_library_items_isActive_idx" ON "equation_library_items"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "equation_library_items_canonicalSubjectId_name_key" ON "equation_library_items"("canonicalSubjectId", "name");

-- AddForeignKey
ALTER TABLE "equation_library_items" ADD CONSTRAINT "equation_library_items_canonicalSubjectId_fkey" FOREIGN KEY ("canonicalSubjectId") REFERENCES "canonical_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
