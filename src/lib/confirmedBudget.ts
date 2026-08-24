import { prisma } from "@/lib/prisma";
import { monthStart } from "@/core/dateUtils";
import { sumSpendByCategory } from "@/core/classifyExpense";
import type { ExpenseCategory } from "@/config";

export type ConfirmedBudgetProgress = {
  baseIncome: number;
  saving: number;
  allocations: Record<ExpenseCategory, number>;
  spentByCategory: Record<ExpenseCategory, number>;
};

/** 이번 달 확정 예산(BudgetPlan)과 실사용액을 함께 조회한다. 확정된 예산이 없으면 null. */
export async function getConfirmedBudgetProgress(
  userId: string,
  targetMonth: string,
): Promise<ConfirmedBudgetProgress | null> {
  const confirmedPlan = await prisma.budgetPlan.findFirst({
    where: { userId, targetMonth, status: "CONFIRMED" },
  });
  if (!confirmedPlan) return null;

  const monthTransactions = await prisma.transaction.findMany({
    where: { userId, occurredAt: { gte: monthStart(targetMonth), lte: new Date() } },
  });

  return {
    baseIncome: confirmedPlan.baseIncome,
    saving: confirmedPlan.saving,
    allocations: confirmedPlan.allocations as Record<ExpenseCategory, number>,
    spentByCategory: sumSpendByCategory(monthTransactions),
  };
}
