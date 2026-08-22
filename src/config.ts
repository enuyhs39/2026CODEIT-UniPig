import type { IncomeCategory } from "@/core/classify";

/** 인증 없이 쓰는 고정 데모 유저 ID (절대 규칙 7번 — 인증은 안 붙이되 userId 컬럼은 남겨둔다). */
export const DEMO_USER_ID = "demo-user";

/** 예산 기준선 분위수. 기본은 balanced(P25) — 절대 규칙 4번, 하드코딩 금지. */
export const BASE_INCOME_QUANTILES = {
  safe: 0.1,
  balanced: 0.25,
  aggressive: 0.5,
} as const;

export type BudgetProfile = keyof typeof BASE_INCOME_QUANTILES;

export const DEFAULT_BUDGET_PROFILE: BudgetProfile = "balanced";

/** 피드백 학습 EMA 계수. 사용자 조정을 즉시 반영하지 않고 천천히 수렴시킨다 (절대 규칙 6번). */
export const FEEDBACK_EMA_ALPHA = 0.25;

/** 몬테카를로 시뮬레이션 횟수. */
export const MONTE_CARLO_SIMULATIONS = 10_000;

/** 카테고리별 최소 생계선(원). 예산 배분이 이 아래로 내려가지 않도록 보장한다. */
export const MIN_SUBSISTENCE = {
  식비: 200_000,
  교통: 30_000,
} as const;

/** 예산 배분 금액 반올림 단위(원). 오차는 가장 큰 카테고리가 흡수한다. */
export const BUDGET_ROUNDING_UNIT = 1_000;

/** 기본 저축률. UserPreference.savingRate 초기값과 동일해야 한다. */
export const DEFAULT_SAVING_RATE = 0.1;

/** 소득원 생존 확률 계산 파라미터. ratio = elapsed / periodDays. */
export const SURVIVAL = {
  graceRatio: 1.2,
  decayRate: 1.5,
  deadThreshold: 0.15,
} as const;

/**
 * profileSource가 계산한 isOverdue를 사용자에게 "입금 지연 알림" 카드로 보여줄 카테고리.
 * 캐시백/장학금/불규칙은 애초에 "정기적으로 들어와야 하는 돈"이 아니라서 지연이라는
 * 개념 자체가 사용자에게 의미가 없다 — 용돈/알바처럼 실제로 매달 기대되는 소득원만 알린다.
 */
export const OVERDUE_ALERT_CATEGORIES: readonly IncomeCategory[] = ["allowance", "salary"];

/** 소득원 카테고리별 계절성 계수. 데이터에서 학습하지 않고 명시 주입한다. */
export const SEASONAL_FACTORS = {
  scholarship: {
    default: 0.05,
    months: { 3: 1.0, 9: 1.0 },
  },
  salary: {
    default: 1.0,
    months: {
      1: 1.45,
      2: 1.45,
      7: 1.45,
      8: 1.45,
      4: 0.6,
      6: 0.6,
      10: 0.6,
      12: 0.6,
    },
  },
  allowance: { default: 1.0, months: {} },
  cashback: { default: 1.0, months: {} },
  irregular: { default: 1.0, months: {} },
} as const;
