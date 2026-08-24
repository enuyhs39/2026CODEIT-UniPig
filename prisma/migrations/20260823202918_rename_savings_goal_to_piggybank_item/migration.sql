/*
  Warnings:

  - You are about to drop the `savings_goals` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PiggyBankItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "PiggyBankCategory" AS ENUM ('PARKING', 'SAVINGS', 'STOCK', 'OTHER');

-- DropTable
DROP TABLE "savings_goals";

-- DropEnum
DROP TYPE "SavingsGoalStatus";

-- CreateTable
CREATE TABLE "piggybank_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "PiggyBankCategory" NOT NULL DEFAULT 'OTHER',
    "target_amount" INTEGER NOT NULL,
    "current_amount" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "target_date" TIMESTAMP(3),
    "status" "PiggyBankItemStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "piggybank_items_pkey" PRIMARY KEY ("id")
);
