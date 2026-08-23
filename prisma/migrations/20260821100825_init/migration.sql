-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('allowance', 'salary', 'scholarship', 'cashback', 'irregular');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'DEFICIT_ALERT');

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "raw_desc" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_events" (
    "tx_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "category" "IncomeCategory" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "is_user_confirmed" BOOLEAN NOT NULL,

    CONSTRAINT "income_events_pkey" PRIMARY KEY ("tx_id")
);

-- CreateTable
CREATE TABLE "source_profiles" (
    "source_id" TEXT NOT NULL,
    "category" "IncomeCategory" NOT NULL,
    "period_days" DOUBLE PRECISION NOT NULL,
    "period_confidence" DOUBLE PRECISION NOT NULL,
    "typical_dom" INTEGER,
    "amount_mu" INTEGER NOT NULL,
    "amount_sigma" DOUBLE PRECISION NOT NULL,
    "occurrence_prob" DOUBLE PRECISION NOT NULL,
    "last_seen" TIMESTAMP(3) NOT NULL,
    "alive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "source_profiles_pkey" PRIMARY KEY ("source_id")
);

-- CreateTable
CREATE TABLE "budget_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_month" TEXT NOT NULL,
    "base_income" INTEGER NOT NULL,
    "ai_allocations" JSONB NOT NULL,
    "allocations" JSONB NOT NULL,
    "saving" INTEGER NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "budget_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "saving_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "income_events" ADD CONSTRAINT "income_events_tx_id_fkey" FOREIGN KEY ("tx_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
