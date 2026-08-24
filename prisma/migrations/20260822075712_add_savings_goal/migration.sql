-- CreateEnum
CREATE TYPE "SavingsGoalStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_amount" INTEGER NOT NULL,
    "current_amount" INTEGER NOT NULL DEFAULT 0,
    "target_date" TIMESTAMP(3),
    "status" "SavingsGoalStatus" NOT NULL DEFAULT 'IN_PROGRESS',

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);
