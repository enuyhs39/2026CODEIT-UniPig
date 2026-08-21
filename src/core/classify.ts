/**
 * 입금 분류 + 소득원 그룹핑 (SPEC.md 2장).
 * 우선순위: 사용자 확정 룰(0.99) → 키워드 사전(0.85) → 휴리스틱(0.6).
 * DB 접근 없는 순수 함수 — 사용자 룰은 호출자가 파라미터로 주입한다.
 */

// 1. 타입 정의 및 설정 상수부

// 소득 카테고리 종류(용돈, 급여/알바, 장학금, 캐시백, 불규칙 기타)
export type IncomeCategory = "allowance" | "salary" | "scholarship" | "cashback" | "irregular";

// 분류 함수의 입력 : 거래 데이터 1건
export type IncomeTransaction = {
  id: string;
  occurredAt: Date;
  amount: number;
  rawDesc: string;
  counterparty: string;
};

// 사용자가 과거에 직접 확정한 카테고리 요인
export type UserRule = {
  rawDesc: string;
  category: IncomeCategory;
};

// 분류 후 개별 입금 이벤트 형태
export type ClassifiedIncomeEvent = {
  txId: string;
  sourceId: string; // 소득원 고유 식별자
  category: IncomeCategory; // 판별된 카티고리
  confidence: number; // 판별 확신도
  isUserConfirmed: boolean; // 사용자의 직접 확인 여부
};

// 전체 분류 결과 : 전체 이벤트 목록 및 사용자 확인 필요 목록 분리
export type ClassificationResult = {
  events: ClassifiedIncomeEvent[];
  needsReview: ClassifiedIncomeEvent[];
};

// 키워드 사전 : 카테고리별 매칭되는 단어 목록
const KEYWORDS: Record<"scholarship" | "salary" | "cashback", string[]> = {
  scholarship: ["장학", "국가장학재단", "교내장학"],
  salary: ["급여", "임금", "주식회사", "(주)", "알바"],
  cashback: ["캐시백", "리워드", "환급", "적립"],
};

// 휴리스틱 판정용 기준 상수
const HEURISTIC_MIN_COUNT = 3; // 최소 3회 이상 입금되어야 함
const HEURISTIC_MAX_DAY_STD_DEV = 5; // 입금 날짜 표준편차가 5일 이내로 일정해야 함
const CONFIDENCE_REVIEW_THRESHOLD = 0.7; // 확신도가 0.7 미만이면 사용자 확인 필요

// 2. 전처리 및 헬퍼 함수들

/** counterparty 정규화 — 공백/특수문자 제거, (주)·주식회사 제거, 숫자 꼬리표 제거. */
export function normalizeCounterparty(raw: string): string {
  let s = raw.replace(/\(주\)/g, "").replace(/주식회사/g, "");
  s = s.replace(/[^\p{L}\p{N}]/gu, "");
  s = s.replace(/\d+$/, "");
  return s;
}

//** rawDesc에 키워드가 포함되어 있는지 확인하고, 포함된 카테고리 반환. */
function matchKeyword(rawDesc: string): "scholarship" | "salary" | "cashback" | null {
  for (const category of ["scholarship", "salary", "cashback"] as const) {
    if (KEYWORDS[category].some((kw) => rawDesc.includes(kw))) {
      return category;
    }
  }
  return null; // 키워드 사전과 매칭되지 않으면 null 반환
}

//** 입금액이 만원 단위인지 확인 : 용돈 판별 보조 */
function isRoundToTenThousand(amount: number): boolean {
  return amount % 10_000 === 0;
}

//** 입금 일자 표준편차 계산(주기성 검사) : 용돈 판별 보조 */
function dayOfMonthStdDev(dates: Date[]): number {
  const days = dates.map((d) => d.getUTCDate());
  const mean = days.reduce((s, d) => s + d, 0) / days.length;
  const variance = days.reduce((s, d) => s + (d - mean) ** 2, 0) / days.length;
  return Math.sqrt(variance);
}

/** 같은 정규화된 counterparty의 입금들이 "용돈스러운" 패턴인지: 3회+, 만원단위, 비슷한 날짜. */
function looksLikeAllowance(group: IncomeTransaction[]): boolean {
  return (
    group.length >= HEURISTIC_MIN_COUNT &&
    group.every((tx) => isRoundToTenThousand(tx.amount)) &&
    dayOfMonthStdDev(group.map((tx) => tx.occurredAt)) <= HEURISTIC_MAX_DAY_STD_DEV
  );
}

/**
 * 입금 거래들을 분류하고 소득원으로 그룹핑한다. 지출(amount<=0)은 무시한다.
 * sourceId = `정규화된counterparty:category` — 소득원 그룹 키.
 */
export function classifyIncomeTransactions(
  transactions: IncomeTransaction[],
  userRules: UserRule[] = [],
): ClassificationResult {
  const ruleMap = new Map(userRules.map((r) => [r.rawDesc, r.category])); // 빠른 검색을 위해 사용자 확정 룰을 Map(Key-Value) 형태로 변환
  const incomeTxs = transactions.filter((tx) => tx.amount > 0); // 지출(출금, amount <= 0)은 제외하고 순수 입금(amount > 0)만 추출

  // [사전 그룹핑] 거래처별로 거래들을 미리 바구니(Map)에 모아둠 (휴리스틱 통계 계산용)
  const byCounterparty = new Map<string, IncomeTransaction[]>();
  for (const tx of incomeTxs) {
    const key = normalizeCounterparty(tx.counterparty);
    const group = byCounterparty.get(key) ?? [];
    group.push(tx);
    byCounterparty.set(key, group);
  }

  const events: ClassifiedIncomeEvent[] = [];
  const needsReview: ClassifiedIncomeEvent[] = [];

  // 각 입금 건을 3단계 우선순위 룰에 따라 하나씩 판별
  for (const tx of incomeTxs) {
    const normalized = normalizeCounterparty(tx.counterparty);
    const userRuleMatch = ruleMap.get(tx.rawDesc);

    let category: IncomeCategory;
    let confidence: number;
    let isUserConfirmed = false;

    // [1순위] 사용자 확정 룰에 있는 텍스트인가?
    if (userRuleMatch) {
      category = userRuleMatch;
      confidence = 0.99;
      isUserConfirmed = true;
    } else {
      // [2순위] 키워드 사전에 걸리는 단어가 있는가?
      const keywordMatch = matchKeyword(tx.rawDesc);
      if (keywordMatch) {
        category = keywordMatch;
        confidence = 0.85;
      } else {
        // [3순위] 휴리스틱 판정 : 같은 거래처 입금들의 주기/금액 통계를 보고 용돈 여부 추정
        const group = byCounterparty.get(normalized) ?? [tx];
        category = looksLikeAllowance(group) ? "allowance" : "irregular";
        confidence = 0.6;
      }
    }

    // 분류 결과 객체 생성 (소득원 키 = 정규화거래처:카테고리)
    const event: ClassifiedIncomeEvent = {
      txId: tx.id,
      sourceId: `${normalized}:${category}`,
      category,
      confidence,
      isUserConfirmed,
    };

    // 신뢰도가 0.7 미만이면 UI에서 사용자에게 물어볼 목록(needsReview)에 추가
    events.push(event);
    if (confidence < CONFIDENCE_REVIEW_THRESHOLD) {
      needsReview.push(event);
    }
  }

  return { events, needsReview };
}
