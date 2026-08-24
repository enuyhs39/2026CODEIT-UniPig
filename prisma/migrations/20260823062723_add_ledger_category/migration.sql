/*
  Warnings:

  - You are about to drop the column `category` on the `ledger_entries` table. All the data in the column will be lost.
  - Added the required column `category_id` to the `ledger_entries` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaletteColor" AS ENUM ('DEFAULT', 'GRAY', 'BROWN', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'PINK', 'RED');

-- AlterTable
ALTER TABLE "ledger_entries" DROP COLUMN "category",
ADD COLUMN     "category_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ledger_categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" "PaletteColor" NOT NULL DEFAULT 'DEFAULT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ledger_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ledger_categories_user_id_label_key" ON "ledger_categories"("user_id", "label");

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ledger_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
