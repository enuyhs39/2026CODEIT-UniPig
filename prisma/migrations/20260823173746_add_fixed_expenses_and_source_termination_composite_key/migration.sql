-- CreateEnum
CREATE TYPE "FixedExpenseCategory" AS ENUM ('TRANSPORT', 'RENT', 'PHONE', 'SUBSCRIPTION');

-- AlterTable
ALTER TABLE "source_terminations" DROP CONSTRAINT "source_terminations_pkey",
ADD CONSTRAINT "source_terminations_pkey" PRIMARY KEY ("source_id", "user_id");

-- CreateTable
CREATE TABLE "fixed_expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" "FixedExpenseCategory" NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fixed_expenses_user_id_category_key" ON "fixed_expenses"("user_id", "category");

