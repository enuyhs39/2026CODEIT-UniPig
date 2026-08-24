import { describe, expect, it } from "vitest";
import { buildBudget, pickBaseIncome, type BudgetInput } from "@/core/budget";
import type { Percentiles } from "@/core/forecast";

function baseInput(overrides: Partial<BudgetInput> = {}): BudgetInput {
  return {
    baseIncome: 1_000_000,
    fixedExpenses: 0,
    categoryHistoricalSpend: {
      식비: 270_000,
      쇼핑: 90_000,
      "문화/여가": 90_000,
      "교육/자기계발": 60_000,
      "생필품/경조사": 60_000,
      기타: 30_000,
    },
    userWeights: {},
    savingRate: 0.1,
    ...overrides,
  };
}

describe("pickBaseIncome", () => {
  const percentiles: Percentiles = { p10: 100, p25: 200, p50: 300, p90: 900 };

  it("safe 프로필은 p10을 고른다", () => {
    expect(pickBaseIncome(percentiles, "safe")).toBe(100);
  });
  it("balanced 프로필은 p25를 고른다", () => {
    expect(pickBaseIncome(percentiles, "balanced")).toBe(200);
  });
  it("aggressive 프로필은 p50을 고른다", () => {
    expect(pickBaseIncome(percentiles, "aggressive")).toBe(300);
  });
});

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
    expect(result.allocations).toEqual({
      식비: 405_000,
      쇼핑: 135_000,
      "문화/여가": 135_000,
      "교육/자기계발": 90_000,
      "생필품/경조사": 90_000,
      기타: 45_000,
    });
  });

  it("userWeights가 특정 카테고리 비중을 키운다", () => {
    // 모든 카테고리가 각자 최소생계선보다 충분히 위에 있도록 잡아서, userWeights 효과만 순수하게 확인
    const result = buildBudget(
      baseInput({
        baseIncome: 2_000_000,
        fixedExpenses: 0,
        categoryHistoricalSpend: {
          식비: 300_000,
          쇼핑: 100_000,
          "문화/여가": 100_000,
          "교육/자기계발": 100_000,
          "생필품/경조사": 100_000,
          기타: 100_000,
        },
        // 문화/여가만 3배 가중 → w[문화/여가]=100,000*3=300,000, w[식비]=300,000*1=300,000 (동률)
        userWeights: { "문화/여가": 3 },
        savingRate: 0,
      }),
    );
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    expect(result.allocations).toEqual({
      식비: 600_000,
      쇼핑: 200_000,
      "문화/여가": 600_000,
      "교육/자기계발": 200_000,
      "생필품/경조사": 200_000,
      기타: 200_000,
    });
  });

  it("최소생계선 미달분은 다른(생계선 미대상) 카테고리에서 비례 차감한다", () => {
    // spendable=440,000, 가중치대로면 식비=40,000(<200,000 미달), 생필품/경조사=80,000, 나머지 4개는 80,000씩
    const result = buildBudget(
      baseInput({
        baseIncome: 440_000,
        fixedExpenses: 0,
        categoryHistoricalSpend: {
          식비: 10_000,
          쇼핑: 20_000,
          "문화/여가": 20_000,
          "교육/자기계발": 20_000,
          "생필품/경조사": 20_000,
          기타: 20_000,
        },
        savingRate: 0,
      }),
    );
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    expect(result.allocations.식비).toBe(200_000); // 최소생계선으로 상향
    expect(result.allocations["생필품/경조사"]).toBe(80_000); // 생계선 대상이라 차감 면제
    expect(result.allocations.쇼핑).toBe(40_000);
    expect(result.allocations["문화/여가"]).toBe(40_000);
    expect(result.allocations["교육/자기계발"]).toBe(40_000);
    expect(result.allocations.기타).toBe(40_000);

    const sum = Object.values(result.allocations).reduce((s, v) => s + v, 0);
    expect(sum).toBe(440_000); // 반올림 후에도 배분 합계 = spendable
  });

  it("다른 카테고리를 0으로 만들어도 최소생계선이 모자라면 나머지는 저축에서 차감한다", () => {
    const result = buildBudget(
      baseInput({
        baseIncome: 250_000,
        fixedExpenses: 0,
        categoryHistoricalSpend: {
          식비: 10_000,
          쇼핑: 10_000,
          "문화/여가": 10_000,
          "교육/자기계발": 10_000,
          "생필품/경조사": 10_000,
          기타: 10_000,
        },
        savingRate: 0.4, // disposable=250,000 → saving=100,000, spendable=150,000
      }),
    );
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    expect(result.allocations).toEqual({
      식비: 200_000,
      "생필품/경조사": 30_000,
      쇼핑: 0,
      "문화/여가": 0,
      "교육/자기계발": 0,
      기타: 0,
    });
    expect(result.saving).toBe(20_000); // 100,000 - (부족분 80,000)

    // 전체 금액 보존: 배분 합계 + 저축 = disposable
    const sum = Object.values(result.allocations).reduce((s, v) => s + v, 0);
    expect(sum + result.saving).toBe(result.disposable);
  });

  it("저축까지 바닥나도 여전히 모자라면(disposable < 최소생계선 총액) 존재하지 않는 돈을 만들지 않고 최소생계선끼리 비례 축소한다", () => {
    // disposable=0 → saving=0, spendable=0 → 모든 카테고리 raw=0인데 최소생계선(23만원)을 채울 돈 자체가 없음
    const result = buildBudget(
      baseInput({
        baseIncome: 0,
        fixedExpenses: 0,
        categoryHistoricalSpend: {
          식비: 10_000,
          쇼핑: 10_000,
          "문화/여가": 10_000,
          "교육/자기계발": 10_000,
          "생필품/경조사": 10_000,
          기타: 10_000,
        },
        savingRate: 0.1,
      }),
    );
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    expect(result.saving).toBe(0);
    const sum = Object.values(result.allocations).reduce((s, v) => s + v, 0);
    expect(sum).toBe(0); // 존재하지 않는 돈을 만들어내지 않음 — 배분 합계 + 저축 = disposable(0)
  });

  it("1,000원 단위 반올림 오차는 가장 큰 카테고리가 흡수해서 합계를 맞춘다", () => {
    const result = buildBudget(
      baseInput({
        baseIncome: 605_000,
        fixedExpenses: 0,
        categoryHistoricalSpend: {
          식비: 500_500,
          "생필품/경조사": 100_000,
          쇼핑: 1_500,
          "문화/여가": 1_500,
          "교육/자기계발": 0, // 아직 과거 지출 데이터가 없는 신규 카테고리
          기타: 1_500,
        },
        savingRate: 0,
      }),
    );
    expect(result.status).toBe("DRAFT");
    if (result.status !== "DRAFT") throw new Error("unreachable");

    // 개별 반올림만 하면 501,000+100,000+2,000+2,000+0+2,000=607,000으로 spendable(605,000)보다 2,000 많아짐
    // → 가장 큰 카테고리(식비)가 2,000을 흡수
    expect(result.allocations).toEqual({
      식비: 499_000,
      "생필품/경조사": 100_000,
      쇼핑: 2_000,
      "문화/여가": 2_000,
      "교육/자기계발": 0,
      기타: 2_000,
    });

    const sum = Object.values(result.allocations).reduce((s, v) => s + v, 0);
    expect(sum).toBe(result.spendable);
  });
});
