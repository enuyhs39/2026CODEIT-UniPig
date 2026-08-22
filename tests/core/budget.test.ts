import { describe, expect, it } from "vitest";
import { buildBudget, type BudgetInput } from "@/core/budget";

function baseInput(overrides: Partial<BudgetInput> = {}): BudgetInput {
  return {
    baseIncome: 1_000_000,
    fixedExpenses: 0,
    categoryHistoricalSpend: { 식비: 300_000, 카페: 100_000, 쇼핑: 100_000, 교통: 50_000, 기타: 50_000 },
    userWeights: {},
    savingRate: 0.1,
    ...overrides,
  };
}

describe("buildBudget", () => {
  it("disposable(base - 고정지출) < 0이면 DEFICIT_ALERT와 shortfall을 반환한다", () => {
    const result = buildBudget(baseInput({ baseIncome: 300_000, fixedExpenses: 400_000 }));
    expect(result).toEqual({
      status: "DEFICIT_ALERT",
      baseIncome: 300_000,
      fixedExpenses: 400_000,
      shortfall: 100_000,
    });
  });

  it("최소생계선 문제가 없으면 과거지출 비중대로 spendable을 배분한다", () => {
    const result = buildBudget(baseInput());
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    expect(result.disposable).toBe(1_000_000);
    expect(result.saving).toBe(100_000);
    expect(result.spendable).toBe(900_000);
    expect(result.allocations).toEqual({ 식비: 450_000, 카페: 150_000, 쇼핑: 150_000, 교통: 75_000, 기타: 75_000 });
  });

  it("userWeights가 특정 카테고리 비중을 키운다", () => {
    // 모든 카테고리가 각자 최소생계선보다 충분히 위에 있도록 잡아서, userWeights 효과만 순수하게 확인
    const result = buildBudget(
      baseInput({
        baseIncome: 2_000_000,
        fixedExpenses: 0,
        categoryHistoricalSpend: { 식비: 300_000, 카페: 100_000, 쇼핑: 100_000, 교통: 100_000, 기타: 100_000 },
        userWeights: { 카페: 3 }, // 카페만 3배 가중 → w[카페]=100,000*3=300,000, w[식비]=300,000*1=300,000 (동률)
        savingRate: 0,
      }),
    );
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    expect(result.allocations).toEqual({ 식비: 667_000, 카페: 667_000, 쇼핑: 222_000, 교통: 222_000, 기타: 222_000 });
  });

  it("최소생계선 미달분은 다른(생계선 미대상) 카테고리에서 비례 차감한다", () => {
    // spendable=400,000, 균등분배라면 식비=44,444.44(<200,000 미달), 나머지 88,888.89씩
    const result = buildBudget(
      baseInput({
        baseIncome: 400_000,
        fixedExpenses: 0,
        categoryHistoricalSpend: { 식비: 50_000, 카페: 100_000, 쇼핑: 100_000, 교통: 100_000, 기타: 100_000 },
        savingRate: 0,
      }),
    );
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    expect(result.allocations.식비).toBe(200_000); // 최소생계선으로 상향
    expect(result.allocations.교통).toBe(89_000); // 생계선 대상이라 차감 면제, 반올림만 적용
    expect(result.allocations.카페).toBe(37_000);
    expect(result.allocations.쇼핑).toBe(37_000);
    expect(result.allocations.기타).toBe(37_000);

    const sum = Object.values(result.allocations).reduce((s, v) => s + v, 0);
    expect(sum).toBe(400_000); // 반올림 후에도 배분 합계 = spendable
  });

  it("다른 카테고리를 0으로 만들어도 최소생계선이 모자라면 나머지는 저축에서 차감한다", () => {
    const result = buildBudget(
      baseInput({
        baseIncome: 250_000,
        fixedExpenses: 0,
        categoryHistoricalSpend: { 식비: 10_000, 카페: 10_000, 쇼핑: 10_000, 교통: 10_000, 기타: 10_000 },
        savingRate: 0.5, // disposable=250,000 → saving=125,000, spendable=125,000
      }),
    );
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    expect(result.allocations).toEqual({ 식비: 200_000, 교통: 30_000, 카페: 0, 쇼핑: 0, 기타: 0 });
    expect(result.saving).toBe(20_000); // 125,000 - (부족분 105,000)

    // 전체 금액 보존: 배분 합계 + 저축 = disposable
    const sum = Object.values(result.allocations).reduce((s, v) => s + v, 0);
    expect(sum + result.saving).toBe(result.disposable);
  });

  it("1,000원 단위 반올림 오차는 가장 큰 카테고리가 흡수해서 합계를 맞춘다", () => {
    const result = buildBudget(
      baseInput({
        baseIncome: 605_000,
        fixedExpenses: 0,
        categoryHistoricalSpend: { 식비: 500_500, 교통: 100_000, 카페: 1_500, 쇼핑: 1_500, 기타: 1_500 },
        savingRate: 0,
      }),
    );
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    // 개별 반올림만 하면 501,000+100,000+2,000+2,000+2,000=607,000으로 spendable(605,000)보다 2,000 많아짐
    // → 가장 큰 카테고리(식비)가 2,000을 흡수
    expect(result.allocations).toEqual({ 식비: 499_000, 교통: 100_000, 카페: 2_000, 쇼핑: 2_000, 기타: 2_000 });

    const sum = Object.values(result.allocations).reduce((s, v) => s + v, 0);
    expect(sum).toBe(result.spendable);
  });
});
