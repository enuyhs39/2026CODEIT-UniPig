import { describe, expect, it } from "vitest";
import { simulatePurchase, type SimulateBudgetProgress } from "@/core/simulatePurchase";

function baseProgress(overrides: Partial<SimulateBudgetProgress> = {}): SimulateBudgetProgress {
  return {
    allocations: { 식비: 300_000, 카페: 100_000, 쇼핑: 100_000, 교통: 50_000, 기타: 50_000 },
    spentByCategory: { 식비: 200_000, 카페: 50_000, 쇼핑: 0, 교통: 0, 기타: 0 },
    ...overrides,
  };
}

describe("simulatePurchase", () => {
  it("예산 안에 들어오면 overBudget=false, overBy=0", () => {
    const result = simulatePurchase(baseProgress(), "식비", 50_000);
    expect(result.remainingBefore).toBe(100_000);
    expect(result.remainingAfter).toBe(50_000);
    expect(result.overBudget).toBe(false);
    expect(result.overBy).toBe(0);
  });

  it("예산을 초과하면 overBudget=true, overBy=초과액", () => {
    const result = simulatePurchase(baseProgress(), "식비", 150_000);
    expect(result.remainingAfter).toBe(-50_000);
    expect(result.overBudget).toBe(true);
    expect(result.overBy).toBe(50_000);
  });

  it("배분/사용액이 없는 카테고리는 0으로 취급한다", () => {
    const result = simulatePurchase(baseProgress({ allocations: {} as never, spentByCategory: {} as never }), "기타", 10_000);
    expect(result.budget).toBe(0);
    expect(result.spentBefore).toBe(0);
    expect(result.overBudget).toBe(true);
    expect(result.overBy).toBe(10_000);
  });

  it("정확히 예산과 같으면 초과가 아니다(경계값)", () => {
    const result = simulatePurchase(baseProgress(), "교통", 50_000);
    expect(result.remainingAfter).toBe(0);
    expect(result.overBudget).toBe(false);
  });
});
