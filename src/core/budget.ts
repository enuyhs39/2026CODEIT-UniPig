/**
 * 예산 수립 (SPEC.md 5장). 소득 예측 기준선(base_income)과 카테고리별 과거평균지출을 받아
 * 카테고리별 배분안을 만든다. DB 접근 없는 순수 함수 — 입력값은 모두 호출자가 이미
 * 계산해서 넘긴다(baseIncome은 forecastIncome의 percentile, categoryHistoricalSpend는
 * classifyExpense.ts의 averageMonthlySpendByCategory).
 */

import { BASE_INCOME_QUANTILES, BUDGET_ROUNDING_UNIT, MIN_SUBSISTENCE, type BudgetProfile, type ExpenseCategory } from "@/config";
import type { Percentiles } from "./forecast";

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

/** SPEC.md 5장 1단계: forecastIncome의 percentile 중 profile(safe/balanced/aggressive)에 대응하는 값을 고른다. */
export function pickBaseIncome(percentiles: Percentiles, profile: BudgetProfile): number {
  const q = BASE_INCOME_QUANTILES[profile];
  if (q === 0.1) return percentiles.p10;
  if (q === 0.25) return percentiles.p25;
  return percentiles.p50;
}

/**
 * 최소 생계선(식비/생필품·경조사) 미달 카테고리를 끌어올리고, 그 부족분은 생계선 대상이 아닌
 * 카테고리에서 비례 차감한다. 그래도 부족하면 저축에서 뗀다 — SPEC.md 5장 7번.
 * 저축까지 바닥나면(disposable 자체가 최소생계선 총액보다 적은 경우) 존재하지 않는 돈을
 * 만들어낼 수는 없으므로, 최소생계선으로 끌어올린 카테고리끼리도 비례로 다시 깎아서
 * "배분 합계 + 저축 = disposable" 보존 법칙을 항상 지킨다.
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

  for (const c of donors) {
    result[c] = 0;
  }
  let remainder = deficit - donorTotal;

  const takenFromSaving = Math.min(remainder, saving);
  saving -= takenFromSaving;
  remainder -= takenFromSaving;

  if (remainder > 0) {
    // 저축도 바닥났는데 여전히 모자람 = disposable 총액이 최소생계선 합계보다 작다는 뜻.
    // 이 경우 최소생계선 자체를 지킬 수 없다 — 있는 돈 안에서 방금 끌어올린 카테고리끼리 비례 축소한다.
    const floorCategories = (Object.keys(MIN_SUBSISTENCE) as ExpenseCategory[]).filter((c) => result[c] !== undefined);
    const floorTotal = floorCategories.reduce((sum, c) => sum + result[c], 0);
    for (const c of floorCategories) {
      result[c] -= remainder * (result[c] / floorTotal);
    }
  }

  return { allocations: result, saving };
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

  // "가용예산" 카드는 화면에 표시되는 반올림된 저축액 기준으로 계산해야
  // "예상수입 - 고정지출 - 저축" 표시값과 정확히 맞는다(disposable = roundedSaving + spendable 보존).
  const roundedSaving = roundToUnit(saving, BUDGET_ROUNDING_UNIT);

  return {
    status: "DRAFT",
    baseIncome,
    disposable,
    saving: roundedSaving,
    spendable: disposable - roundedSaving,
    allocations: roundAllocationsToTarget(allocations, allocationSum),
  };
}
