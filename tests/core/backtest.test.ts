import { describe, expect, it } from "vitest";
import { runBacktest } from "@/core/backtest";
import type { IncomeTransaction } from "@/core/classify";

// 2025년 1~6월, 매달 5일 400,000원 "엄마 용돈" — 규칙적인 소득원 하나
function allowanceTx(monthsFromJan: number, id: string): IncomeTransaction {
  const month = 1 + monthsFromJan;
  return {
    id,
    occurredAt: new Date(`2025-${String(month).padStart(2, "0")}-05`),
    amount: 400_000,
    rawDesc: "엄마 용돈",
    counterparty: "엄마",
  };
}

const transactions = Array.from({ length: 6 }, (_, i) => allowanceTx(i, `t${i}`));

describe("runBacktest", () => {
  it("규칙적인 소득원은 3개월 홀드아웃 전부 커버리지 안에 들고 붕괴가 없다", () => {
    const summary = runBacktest(transactions, ["2025-04", "2025-05", "2025-06"], 1);
    expect(summary.months).toHaveLength(3);
    expect(summary.coverageRate).toBe(1);
    expect(summary.collapseRate).toBe(0);
    for (const m of summary.months) {
      expect(m.actual).toBe(400_000);
      expect(m.inCoverageBand).toBe(true);
      expect(m.budgetCollapsed).toBe(false);
      expect(m.avgPinballLoss).toBeGreaterThanOrEqual(0);
    }
  });

  it("같은 seed면 결과가 재현된다", () => {
    const a = runBacktest(transactions, ["2025-04"], 1);
    const b = runBacktest(transactions, ["2025-04"], 1);
    expect(a).toEqual(b);
  });

  it("소득원이 갑자기 끊기면(모델이 아직 감지 못한 상태) 예산 붕괴로 잡힌다", () => {
    // transactions는 6월까지만 있음 — 7월엔 실제로 안 들어오지만, 6월 시점 생존확률은
    // 아직 grace 구간(1.2주기 이내)이라 예측은 여전히 "들어올 것"으로 봄 → 실제와 어긋남.
    const summary = runBacktest(transactions, ["2025-07"], 1);
    const [month] = summary.months;
    expect(month.actual).toBe(0);
    expect(month.budgetCollapsed).toBe(true);
    expect(month.inCoverageBand).toBe(false);
  });
});
