/**
 * 백테스트 (SPEC.md 7장). 마지막 N개월을 홀드아웃으로 놓고, 그 달이 시작되기 전 데이터만으로
 * classify(T4) → profiling(T5) → forecast(T6)를 재현해서 실제 수입과 비교한다.
 * DB 접근 없는 순수 함수 — 기존 core 모듈들을 그대로 조합만 한다.
 */

import {
  classifyIncomeTransactions,
  type IncomeCategory,
  type IncomeTransaction,
  type UserRule,
} from "./classify";
import { profileSource, type IncomeOccurrence } from "./profiling";
import { forecastIncome, type ForecastSourceInput, type Percentiles } from "./forecast";
import { pinballLoss } from "./stats";

export type BacktestMonthResult = {
  targetMonth: string;
  actual: number;
  predicted: Percentiles;
  inCoverageBand: boolean; // actual가 [P10, P90] 안에 들었는지
  avgPinballLoss: number; // P10/P25/P50/P90 4개 tau의 평균 pinball loss
  budgetCollapsed: boolean; // actual < 예측 P25(기준선)
};

export type BacktestSummary = {
  months: BacktestMonthResult[];
  coverageRate: number;
  avgPinballLoss: number;
  collapseRate: number;
};

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** "YYYY-MM" → 그 달의 [시작, 끝) UTC 날짜 범위. */
function monthRange(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/**
 * holdoutMonths(예: ["2025-10","2025-11","2025-12"]) 각각에 대해, 그 달 시작 이전 거래만으로
 * 예측한 뒤 실제 수입과 비교한다. seed는 forecastIncome에 그대로 전달(재현성).
 */
export function runBacktest(
  transactions: IncomeTransaction[],
  holdoutMonths: string[],
  seed: number,
  userRules: UserRule[] = [],
): BacktestSummary {
  const months = holdoutMonths.map((targetMonth) => {
    const { start, end } = monthRange(targetMonth);

    const trainTx = transactions.filter((tx) => tx.occurredAt < start);
    const { events } = classifyIncomeTransactions(trainTx, userRules);

    const amountByTxId = new Map(trainTx.map((tx) => [tx.id, tx.amount]));
    const occurredAtByTxId = new Map(trainTx.map((tx) => [tx.id, tx.occurredAt]));

    const occurrencesBySource = new Map<
      string,
      { category: IncomeCategory; occurrences: IncomeOccurrence[] }
    >();
    for (const e of events) {
      const entry = occurrencesBySource.get(e.sourceId) ?? { category: e.category, occurrences: [] };
      entry.occurrences.push({
        occurredAt: occurredAtByTxId.get(e.txId)!,
        amount: amountByTxId.get(e.txId)!,
      });
      occurrencesBySource.set(e.sourceId, entry);
    }

    const sources: ForecastSourceInput[] = [];
    for (const { category, occurrences } of occurrencesBySource.values()) {
      const profile = profileSource(occurrences, start);
      if (!profile.profilable) continue;
      sources.push({
        category,
        occurrenceProb: profile.occurrenceProb,
        survivalProb: profile.survivalProb,
        amountMu: profile.amountMu,
        amountSigma: profile.amountSigma,
      });
    }

    const { percentiles } = forecastIncome(sources, targetMonth, seed);

    const actual = transactions
      .filter((tx) => tx.amount > 0 && tx.occurredAt >= start && tx.occurredAt < end)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const pinballTargets: [number, number][] = [
      [0.1, percentiles.p10],
      [0.25, percentiles.p25],
      [0.5, percentiles.p50],
      [0.9, percentiles.p90],
    ];
    const avgPinballLoss = mean(pinballTargets.map(([tau, predicted]) => pinballLoss(tau, actual, predicted)));

    const result: BacktestMonthResult = {
      targetMonth,
      actual,
      predicted: percentiles,
      inCoverageBand: actual >= percentiles.p10 && actual <= percentiles.p90,
      avgPinballLoss,
      budgetCollapsed: actual < percentiles.p25,
    };
    return result;
  });

  return {
    months,
    coverageRate: mean(months.map((m) => (m.inCoverageBand ? 1 : 0))),
    avgPinballLoss: mean(months.map((m) => m.avgPinballLoss)),
    collapseRate: mean(months.map((m) => (m.budgetCollapsed ? 1 : 0))),
  };
}
