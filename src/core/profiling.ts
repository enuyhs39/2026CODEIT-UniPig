/**
 * 소득원 주기성·변동성·생존확률 프로파일링 (SPEC.md 3장).
 * DB 접근 없는 순수 함수 — classify.ts가 그룹핑한 소득원 하나의 입금 이력을 입력으로 받는다.
 */

import { SURVIVAL } from "@/config";

const MIN_SIGMA = 0.05;
const MONTHLY_MIN_DAYS = 26;
const MONTHLY_MAX_DAYS = 34;
const DOM_CONFIDENCE_WINDOW = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// 소득원 프로파일링 입력: 입금 1건 (날짜, 금액)
export type IncomeOccurrence = {
  occurredAt: Date;
  amount: number;
};

// 프로파일링된 소득원 통계 (SPEC.md source_profiles 모델 대응)
export type SourceProfile = {
  periodDays: number;
  periodConfidence: number;
  typicalDom: number | null;
  amountMu: number;
  amountSigma: number;
  occurrenceProb: number;
  lastSeen: Date;
  elapsedDays: number;
  survivalProb: number;
  alive: boolean;
  // 평소 주기는 지났는데 아직 dead로 확정되진 않은 경고 구간(T10 입금 지연 알림 카드용)
  isOverdue: boolean;
};

// 입금 2건 미만이면 프로파일링 자체가 불가능하므로 분기 처리
export type ProfilingResult = { profilable: false } | ({ profilable: true } & SourceProfile);

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function clip(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 소득원 하나의 입금 이력을 프로파일링한다.
 * today는 생존확률 계산 기준일(기본값: 현재 시각) — 백테스트에서는 특정 시점을 주입해서 쓴다.
 */
export function profileSource(
  occurrences: IncomeOccurrence[],
  today: Date = new Date(),
): ProfilingResult {
  if (occurrences.length < 2) {
    return { profilable: false };
  }

  const sorted = [...occurrences].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const gaps = sorted.slice(1).map((occ, i) => daysBetween(sorted[i].occurredAt, occ.occurredAt));

  const periodDays = median(gaps);
  let periodConfidence = clip(1 - stdDev(gaps) / periodDays, 0, 1);

  let typicalDom: number | null = null;
  if (periodDays >= MONTHLY_MIN_DAYS && periodDays <= MONTHLY_MAX_DAYS) {
    const doms = sorted.map((occ) => occ.occurredAt.getUTCDate());
    typicalDom = median(doms);
    periodConfidence = clip(
      Math.max(periodConfidence, 1 - stdDev(doms) / DOM_CONFIDENCE_WINDOW),
      0,
      1,
    );
  }

  // 금액은 로그정규 분포 가정 — sigma는 완벽히 균일한 금액(0)에서도 몬테카를로가 죽지 않도록 최소값으로 클램프
  const logAmounts = sorted.map((occ) => Math.log(occ.amount));
  const amountMu = Math.exp(mean(logAmounts));
  const amountSigma = Math.max(stdDev(logAmounts), MIN_SIGMA);

  const firstSeen = sorted[0].occurredAt;
  const lastSeen = sorted[sorted.length - 1].occurredAt;

  // 관측 기간 동안 "기대 발생 횟수" 대비 "실제 발생 횟수" — 과외처럼 매 주기 오지 않는 소득원을 반영
  const observedSpanDays = daysBetween(firstSeen, lastSeen);
  const expectedOccurrences = observedSpanDays / periodDays + 1;
  const occurrenceProb = clip(sorted.length / expectedOccurrences, 0, 1);

  const elapsed = daysBetween(lastSeen, today);
  const ratio = elapsed / periodDays;
  const survivalProb =
    ratio <= SURVIVAL.graceRatio ? 1.0 : Math.exp(-SURVIVAL.decayRate * (ratio - SURVIVAL.graceRatio));
  const alive = survivalProb >= SURVIVAL.deadThreshold;
  // survivalProb은 graceRatio(1.2주기)까지 일부러 1.0을 유지(예산이 사소한 지연에 안 흔들리게)하므로,
  // "이미 한 주기분은 지났다"는 더 민감한 신호를 alive 여부와 별개로 둔다.
  const isOverdue = alive && elapsed > periodDays;

  return {
    profilable: true,
    periodDays,
    periodConfidence,
    typicalDom,
    amountMu,
    amountSigma,
    occurrenceProb,
    lastSeen,
    elapsedDays: elapsed,
    survivalProb,
    alive,
    isOverdue,
  };
}
