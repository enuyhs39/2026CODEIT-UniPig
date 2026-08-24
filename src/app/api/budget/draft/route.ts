/**
 * 예산 원안 수립 (SPEC.md 5장). POST /api/budget/draft { targetMonth: "YYYY-MM", fixedExpenses?: number }
 * 고정지출은 이제 FixedExpense 모델에 카테고리별로 저장되지만(온보딩/마이페이지에서 관리),
 * 이 라우트의 요청 계약 자체는 그대로 둔다 — 합산해서 기본값으로 넘겨주는 건 클라이언트(BudgetPlanner) 몫이다.
 */

import { NextResponse } from "next/server";
import { buildProfiledSources } from "@/core/sourcePipeline";
import { forecastIncome, type ForecastSourceInput } from "@/core/forecast";
import { averageMonthlySpendByCategory } from "@/core/classifyExpense";
import { buildBudget, pickBaseIncome } from "@/core/budget";
import { hashSeed } from "@/core/stats";
import { toMonthKey } from "@/core/dateUtils";
import { DEFAULT_BUDGET_PROFILE, DEFAULT_BUDGET_WEIGHTS, DEFAULT_SAVING_RATE, type ExpenseCategory } from "@/config";
import { loadIncomeTransactionsAndRules } from "@/lib/incomeData";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const targetMonth: string | undefined = body.targetMonth;
  const fixedExpenses = Math.round(Number(body.fixedExpenses ?? 0));

  if (!targetMonth || !MONTH_PATTERN.test(targetMonth)) {
    return NextResponse.json({ error: "targetMonth이 YYYY-MM 형식으로 필요합니다" }, { status: 400 });
  }

  const { transactions, userRules } = await loadIncomeTransactionsAndRules(userId);
  const sources = buildProfiledSources(transactions, userRules, new Date());
  const forecastSources: ForecastSourceInput[] = sources.map((s) => ({
    category: s.category,
    occurrenceProb: s.profile.occurrenceProb,
    survivalProb: s.profile.survivalProb,
    amountMu: s.profile.amountMu,
    amountSigma: s.profile.amountSigma,
  }));
  const seed = hashSeed(`${userId}:${targetMonth}`);
  const { percentiles } = forecastIncome(forecastSources, targetMonth, seed);
  const baseIncome = Math.round(pickBaseIncome(percentiles, DEFAULT_BUDGET_PROFILE));

  const allTx = await prisma.transaction.findMany({ where: { userId } });
  const monthCount = new Set(allTx.map((tx) => toMonthKey(tx.occurredAt))).size || 1;
  const categoryHistoricalSpend = averageMonthlySpendByCategory(allTx, monthCount);

  const pref =
    (await prisma.userPreference.findUnique({ where: { userId } })) ??
    (await prisma.userPreference.create({
      data: { userId, weights: DEFAULT_BUDGET_WEIGHTS, savingRate: DEFAULT_SAVING_RATE },
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
    where: { userId, targetMonth, status: "DRAFT" },
  });

  const planData = {
    userId,
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

  return NextResponse.json({ ...plan, spendable: result.spendable });
}
