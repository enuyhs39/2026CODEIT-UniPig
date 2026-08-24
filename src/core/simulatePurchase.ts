/**
 * 구매 시뮬레이션. 확정된 이번 달 예산(카테고리별 배분·실사용액)에 가상 지출 하나를
 * 얹었을 때 그 카테고리 예산이 얼마나 남는지/초과하는지 계산한다. DB 접근 없는 순수 함수.
 */
import type { ExpenseCategory } from "@/config";

export type SimulateBudgetProgress = {
  allocations: Record<ExpenseCategory, number>;
  spentByCategory: Record<ExpenseCategory, number>;
};

export type PurchaseSimulationResult = {
  category: ExpenseCategory;
  amount: number;
  budget: number;
  spentBefore: number;
  remainingBefore: number;
  remainingAfter: number;
  overBudget: boolean;
  overBy: number;
};

export function simulatePurchase(
  progress: SimulateBudgetProgress,
  category: ExpenseCategory,
  amount: number,
): PurchaseSimulationResult {
  const budget = progress.allocations[category] ?? 0;
  const spentBefore = progress.spentByCategory[category] ?? 0;
  const remainingBefore = budget - spentBefore;
  const remainingAfter = remainingBefore - amount;
  const overBudget = remainingAfter < 0;

  return {
    category,
    amount,
    budget,
    spentBefore,
    remainingBefore,
    remainingAfter,
    overBudget,
    overBy: overBudget ? -remainingAfter : 0,
  };
}
