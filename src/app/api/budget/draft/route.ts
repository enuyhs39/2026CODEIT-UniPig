/**
 * 예산 원안 수립 (SPEC.md 5장). POST /api/budget/draft { targetMonth: "YYYY-MM", fixedExpenses?: number }
 * 고정지출은 스키마에 저장 모델이 없어(임의로 만들지 않기로 함) 매 요청 바디로 받는다.
 */

import { NextResponse } from "next/server";
import { buildProfiledSources } from "@/core/sourcePipeline";
import { forecastIncome, type ForecastSourceInput } from "@/core/forecast";
import { averageMonthlySpendByCategory } from "@/core/classifyExpense";
import { buildBudget, pickBaseIncome } from "@/core/budget";
import { hashSeed } from "@/core/stats";
import { toMonthKey } from "@/core/dateUtils";
import { DEFAULT_BUDGET_PROFILE, DEFAULT_SAVING_RATE, DEMO_USER_ID, type ExpenseCategory } from "@/config";
import { loadIncomeTransactionsAndRules } from "@/lib/incomeData";
import { prisma } from "@/lib/prisma";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const DEFAULT_WEIGHTS = Object.fromEntries(
  (["식비", "카페", "쇼핑", "교통", "기타"] as ExpenseCategory[]).map((c) => [c, 1]),
) as Record<ExpenseCategory, number>;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const targetMonth: string | undefined = body.targetMonth;
  const fixedExpenses = Math.round(Number(body.fixedExpenses ?? 0));

  if (!targetMonth || !MONTH_PATTERN.test(targetMonth)) {
    return NextResponse.json({ error: "targetMonth이 YYYY-MM 형식으로 필요합니다" }, { status: 400 });
  }

  const { transactions, userRules } = await loadIncomeTransactionsAndRules();
  const sources = buildProfiledSources(transactions, userRules, new Date());
  const forecastSources: ForecastSourceInput[] = sources.map((s) => ({
    category: s.category,
    occurrenceProb: s.profile.occurrenceProb,
    survivalProb: s.profile.survivalProb,
    amountMu: s.profile.amountMu,
    amountSigma: s.profile.amountSigma,
  }));
  const seed = hashSeed(`${DEMO_USER_ID}:${targetMonth}`);
  const { percentiles } = forecastIncome(forecastSources, targetMonth, seed);
  const baseIncome = Math.round(pickBaseIncome(percentiles, DEFAULT_BUDGET_PROFILE));

  const allTx = await prisma.transaction.findMany({ where: { userId: DEMO_USER_ID } });
  const monthCount = new Set(allTx.map((tx) => toMonthKey(tx.occurredAt))).size || 1;
  const categoryHistoricalSpend = averageMonthlySpendByCategory(allTx, monthCount);

  const pref =
    (await prisma.userPreference.findUnique({ where: { userId: DEMO_USER_ID } })) ??
    (await prisma.userPreference.create({
      data: { userId: DEMO_USER_ID, weights: DEFAULT_WEIGHTS, savingRate: DEFAULT_SAVING_RATE },
    }));

  const result = buildBudget({
    baseIncome,
    fixedExpenses,
    categoryHistoricalSpend,
    userWeights: pref.weights as Record<ExpenseCategory, number>,
    savingRate: pref.savingRate,
  });

  if (result.status === "DEFICIT_ALERT") {
    return NextResponse.json(result);
  }

  const existing = await prisma.budgetPlan.findFirst({
    where: { userId: DEMO_USER_ID, targetMonth, status: "DRAFT" },
  });

  const planData = {
    userId: DEMO_USER_ID,
    targetMonth,
    baseIncome: result.baseIncome,
    aiAllocations: result.allocations,
    allocations: result.allocations,
    saving: result.saving,
    status: "DRAFT" as const,
  };

  const plan = existing
    ? await prisma.budgetPlan.update({ where: { id: existing.id }, data: planData })
    : await prisma.budgetPlan.create({ data: planData });

  return NextResponse.json(plan);
}
