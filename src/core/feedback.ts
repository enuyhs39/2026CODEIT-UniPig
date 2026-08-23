/**
 * 피드백 학습 (SPEC.md 6장). 사용자가 예산을 확정/집행한 결과로 카테고리별 weight를
 * 조금씩 조정한다. DB 접근 없는 순수 함수 — UserPreference.weights를 읽고 갱신값을
 * 반환하면, 저장은 호출자(Route Handler)가 한다.
 */

import { EXECUTION_CORRECTION, FEEDBACK_EMA_ALPHA, FEEDBACK_RATIO_CLIP, type ExpenseCategory } from "@/config";

type WeightMap = Partial<Record<ExpenseCategory, number>>;
type AmountMap = Partial<Record<ExpenseCategory, number>>;

function clip(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 전체 weights의 평균이 1.0이 되도록 정규화한다 — 한 카테고리가 계속 올라가면 나머지가 상대적으로 낮아지게. */
function normalizeWeights(weights: WeightMap): WeightMap {
  const categories = Object.keys(weights) as ExpenseCategory[];
  const mean = categories.reduce((sum, c) => sum + (weights[c] ?? 0), 0) / categories.length;
  const result: WeightMap = {};
  for (const c of categories) {
    result[c] = (weights[c] ?? 0) / mean;
  }
  return result;
}

/**
 * 사용자가 예산을 확정할 때 ai_allocations와 allocations를 비교해 weight를 EMA로 갱신한다.
 * ai_alloc[c] <= 0인 카테고리는 비율을 정의할 수 없으므로 학습에서 제외(skip)한다.
 */
export function updateWeightsFromConfirmation(
  weights: WeightMap,
  aiAllocations: AmountMap,
  userAllocations: AmountMap,
): WeightMap {
  const updated: WeightMap = { ...weights };

  for (const category of Object.keys(aiAllocations) as ExpenseCategory[]) {
    const aiAlloc = aiAllocations[category] ?? 0;
    if (aiAlloc <= 0) continue;

    const userAlloc = userAllocations[category] ?? 0;
    const ratio = clip(userAlloc / aiAlloc, FEEDBACK_RATIO_CLIP.min, FEEDBACK_RATIO_CLIP.max);
    const prevWeight = updated[category] ?? 1;
    updated[category] = prevWeight * (1 - FEEDBACK_EMA_ALPHA) + ratio * FEEDBACK_EMA_ALPHA;
  }

  return normalizeWeights(updated);
}

/**
 * 월말 정산 시 집행률(실제지출/예산)이 낮은 카테고리는 "말로만 늘려달라 한 것"으로 보고
 * weight를 낮춘다. 확정 학습과 달리 여기서는 정규화하지 않는다(SPEC.md 6장에 명시 없음).
 */
export function applyExecutionCorrection(weights: WeightMap, budget: AmountMap, actualSpend: AmountMap): WeightMap {
  const updated: WeightMap = { ...weights };

  for (const category of Object.keys(budget) as ExpenseCategory[]) {
    const budgetAmount = budget[category] ?? 0;
    if (budgetAmount <= 0) continue;

    const execution = (actualSpend[category] ?? 0) / budgetAmount;
    if (execution < EXECUTION_CORRECTION.threshold) {
      updated[category] = (updated[category] ?? 1) * EXECUTION_CORRECTION.factor;
    }
  }

  return updated;
}
