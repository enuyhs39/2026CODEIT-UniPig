/*
  Warnings:

  - Added the required column `type` to the `ledger_categories` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FOOD', 'CAFE', 'SHOPPING', 'TRANSPORT', 'OTHER');

-- AlterTable
ALTER TABLE "ledger_categories" ADD COLUMN     "expense_group" "ExpenseCategory",
ADD COLUMN     "income_group" "IncomeCategory",
ADD COLUMN     "type" "LedgerEntryType" NOT NULL;
