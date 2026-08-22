/**
 * 예산 수립 (SPEC.md 5장). 소득 예측 기준선(base_income)과 카테고리별 과거평균지출을 받아
 * 카테고리별 배분안을 만든다. DB 접근 없는 순수 함수 — 입력값은 모두 호출자가 이미
 * 계산해서 넘긴다(baseIncome은 forecastIncome의 percentile, categoryHistoricalSpend는
 * classifyExpense.ts의 averageMonthlySpendByCategory).
 */

import { BUDGET_ROUNDING_UNIT, MIN_SUBSISTENCE, type ExpenseCategory } from "@/config";

export type BudgetInput = {
  baseIncome: number;
  fixedExpenses: number;
  categoryHistoricalSpend: Record<ExpenseCategory, number>;
  userWeights: Partial<Record<ExpenseCategory, number>>;
  savingRate: number;
};

export type DeficitBudgetResult = {
  status: "DEFICIT_ALERT";
  baseIncome: number;
  fixedExpenses: number;
  shortfall: number;
};

export type DraftBudgetResult = {
  status: "DRAFT";
  baseIncome: number;
  disposable: number;
  saving: number;
  spendable: number;
  allocations: Record<ExpenseCategory, number>;
};

export type BudgetResult = DeficitBudgetResult | DraftBudgetResult;

function roundToUnit(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

/**
 * 최소 생계선(식비/교통) 미달 카테고리를 끌어올리고, 그 부족분은 생계선 대상이 아닌
 * 카테고리에서 비례 차감한다. 그래도 부족하면(다른 카테고리를 0으로 만들어도 모자라면)
 * 남은 부족분은 저축에서 뗀다 — SPEC.md 5장 7번.
 */
function enforceMinSubsistence(
  allocations: Record<ExpenseCategory, number>,
  saving: number,
): { allocations: Record<ExpenseCategory, number>; saving: number } {
  const result = { ...allocations };
  let deficit = 0;

  for (const [category, min] of Object.entries(MIN_SUBSISTENCE) as [ExpenseCategory, number][]) {
    if (result[category] !== undefined && result[category] < min) {
      deficit += min - result[category];
      result[category] = min;
    }
  }
  if (deficit === 0) {
    return { allocations: result, saving };
  }

  const donors = (Object.keys(result) as ExpenseCategory[]).filter((c) => !(c in MIN_SUBSISTENCE));
  const donorTotal = donors.reduce((sum, c) => sum + result[c], 0);

  if (donorTotal >= deficit) {
    for (const c of donors) {
      result[c] -= deficit * (result[c] / donorTotal);
    }
    return { allocations: result, saving };
  }

  // 다른 카테고리를 전부 0으로 만들어도 모자란 나머지는 저축에서 차감
  const remainder = deficit - donorTotal;
  for (const c of donors) {
    result[c] = 0;
  }
  return { allocations: result, saving: Math.max(0, saving - remainder) };
}

/**
 * 배분안을 1,000원 단위로 반올림하되, 반올림 오차는 가장 큰 카테고리가 흡수해서
 * 합계가 targetSum(반올림 전 배분 합계)과 정확히 같아지도록 한다 — SPEC.md 5장 8번.
 */
function roundAllocationsToTarget(
  allocations: Record<ExpenseCategory, number>,
  targetSum: number,
): Record<ExpenseCategory, number> {
  const rounded = {} as Record<ExpenseCategory, number>;
  let roundedSum = 0;
  let largestCategory: ExpenseCategory | null = null;
  let largestValue = -Infinity;

  for (const [category, value] of Object.entries(allocations) as [ExpenseCategory, number][]) {
    const r = roundToUnit(value, BUDGET_ROUNDING_UNIT);
    rounded[category] = r;
    roundedSum += r;
    if (value > largestValue) {
      largestValue = value;
      largestCategory = category;
    }
  }

  if (largestCategory) {
    rounded[largestCategory] += roundToUnit(targetSum, BUDGET_ROUNDING_UNIT) - roundedSum;
  }
  return rounded;
}

export function buildBudget(input: BudgetInput): BudgetResult {
  const { baseIncome, fixedExpenses, categoryHistoricalSpend, userWeights, savingRate } = input;

  const disposable = baseIncome - fixedExpenses;
  if (disposable < 0) {
    return { status: "DEFICIT_ALERT", baseIncome, fixedExpenses, shortfall: -disposable };
  }

  let saving = disposable * savingRate;
  const spendable = disposable - saving;

  const categories = Object.keys(categoryHistoricalSpend) as ExpenseCategory[];
  const weighted: Partial<Record<ExpenseCategory, number>> = {};
  for (const category of categories) {
    weighted[category] = categoryHistoricalSpend[category] * (userWeights[category] ?? 1);
  }
  const totalWeight = categories.reduce((sum, c) => sum + (weighted[c] ?? 0), 0);

  let allocations = {} as Record<ExpenseCategory, number>;
  if (totalWeight > 0) {
    for (const category of categories) {
      allocations[category] = spendable * ((weighted[category] ?? 0) / totalWeight);
    }
  } else {
    // 과거지출 데이터가 전혀 없으면(신규 유저 등) 균등 배분으로 fallback
    const share = spendable / categories.length;
    for (const category of categories) {
      allocations[category] = share;
    }
  }

  const adjusted = enforceMinSubsistence(allocations, saving);
  allocations = adjusted.allocations;
  saving = adjusted.saving;

  const allocationSum = categories.reduce((sum, c) => sum + allocations[c], 0);

  return {
    status: "DRAFT",
    baseIncome,
    disposable,
    saving: roundToUnit(saving, BUDGET_ROUNDING_UNIT),
    spendable,
    allocations: roundAllocationsToTarget(allocations, allocationSum),
  };
}
