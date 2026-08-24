import { describe, expect, it } from "vitest";
import { calculateMonthlySummary } from "@/core/monthlySummary";

describe("calculateMonthlySummary", () => {
  it("수입과 지출을 각각 합산하고 남은 금액을 계산한다", () => {
    const result = calculateMonthlySummary([
      { amount: 400_000 },
      { amount: -30_000 },
      { amount: -10_000 },
    ]);
    expect(result).toEqual({
      totalIncome: 400_000,
      totalExpense: 40_000,
      remaining: 360_000,
    });
  });

  it("거래가 없으면 전부 0이다", () => {
    expect(calculateMonthlySummary([])).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      remaining: 0,
    });
  });

  it("지출만 있으면 remaining이 음수가 될 수 있다", () => {
    const result = calculateMonthlySummary([{ amount: -50_000 }]);
    expect(result.remaining).toBe(-50_000);
  });
});
