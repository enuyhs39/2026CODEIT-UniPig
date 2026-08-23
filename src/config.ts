import type { IncomeCategory } from "@/core/classify";

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

/** 피드백 학습 시 ratio(사용자조정/AI원안) 클램프 범위. 한 번의 확정으로 가중치가 폭주하지 않게 한다. */
export const FEEDBACK_RATIO_CLIP = {
  min: 0.5,
  max: 2.0,
} as const;

/** 월말 집행률 보정 파라미터. execution = 실제지출/예산. 기준 미만이면 "말로만 늘려달라 한 것"으로 보고 가중치를 낮춘다. */
export const EXECUTION_CORRECTION = {
  threshold: 0.7,
  factor: 0.9,
} as const;

/** 몬테카를로 시뮬레이션 횟수. */
export const MONTE_CARLO_SIMULATIONS = 10_000;

/** 예측 히스토그램 bin 개수. 화면에서 재계산하지 않도록 core에서 미리 구간을 나눠 반환한다. */
export const HISTOGRAM_BINS = 20;

/** 예산 배분에 쓰는 지출 카테고리. */
export type ExpenseCategory = "식비" | "카페" | "쇼핑" | "교통" | "기타";

/** 사용자 가중치가 아직 없을 때(첫 예산 초안, 온보딩 직후)의 기본 가중치 — 전 카테고리 동등. */
export const DEFAULT_BUDGET_WEIGHTS: Record<ExpenseCategory, number> = {
  식비: 1,
  카페: 1,
  쇼핑: 1,
  교통: 1,
  기타: 1,
};

/** 카테고리별 최소 생계선(원). 예산 배분이 이 아래로 내려가지 않도록 보장한다. */
export const MIN_SUBSISTENCE: Partial<Record<ExpenseCategory, number>> = {
  식비: 200_000,
  교통: 30_000,
} as const;

/**
 * 가맹점명 → 지출 카테고리. classifyExpense.ts(예산 카테고리별 과거평균지출 집계)와
 * generateDummy.ts(더미 지출 생성)가 공유하는 단일 소스 — 두 곳에 따로 유지하면 어긋난다.
 */
export const MERCHANT_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  김밥천국: "식비",
  교촌치킨: "식비",
  맘스터치: "식비",
  한솥도시락: "식비",
  스타벅스: "카페",
  이디야커피: "카페",
  메가커피: "카페",
  컴포즈커피: "카페",
  올리브영: "쇼핑",
  무신사: "쇼핑",
  쿠팡: "쇼핑",
  다이소: "쇼핑",
  서울교통공사: "교통",
  카카오T: "교통",
  티머니: "교통",
  GS25: "기타",
  CU편의점: "기타",
  약국: "기타",
} as const;

/** MERCHANT_CATEGORY_MAP에 없는 가맹점의 fallback 카테고리. */
export const FALLBACK_EXPENSE_CATEGORY: ExpenseCategory = "기타";

/** 예산 배분 금액 반올림 단위(원). 오차는 가장 큰 카테고리가 흡수한다. */
export const BUDGET_ROUNDING_UNIT = 1_000;

/** 기본 저축률. UserPreference.savingRate 초기값과 동일해야 한다. */
export const DEFAULT_SAVING_RATE = 0.1;

/** 온보딩에서 입력받는 카테고리별 고정지출 라벨. */
export const FIXED_EXPENSE_CATEGORY_LABEL: Record<
  "TRANSPORT" | "RENT" | "PHONE" | "SUBSCRIPTION",
  string
> = {
  TRANSPORT: "교통비",
  RENT: "월세",
  PHONE: "통신비",
  SUBSCRIPTION: "구독비용",
};

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
