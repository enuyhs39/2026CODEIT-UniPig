import { describe, expect, it } from "vitest";
import {
  averageMonthlySpendByCategory,
  classifyExpenseTransactions,
  type ExpenseTransaction,
} from "@/core/classifyExpense";

function tx(overrides: Partial<ExpenseTransaction> & { id: string }): ExpenseTransaction {
  return {
    occurredAt: new Date("2025-01-05"),
    amount: -6_000,
    rawDesc: "",
    counterparty: "",
    ...overrides,
  };
}

describe("classifyExpenseTransactions", () => {
  it("MERCHANT_CATEGORY_MAP에 있는 가맹점은 해당 카테고리로 분류한다", () => {
    const result = classifyExpenseTransactions([
      tx({ id: "t1", counterparty: "스타벅스", amount: -6_000 }),
      tx({ id: "t2", counterparty: "서울교통공사", amount: -1_500 }),
    ]);
    expect(result).toEqual([
      { txId: "t1", category: "식비" },
      { txId: "t2", category: "생필품/경조사" },
    ]);
  });

  it("가맹점명에 지점명이 붙어도 매칭한다 (부분 포함 매칭)", () => {
    const result = classifyExpenseTransactions([
      tx({ id: "t1", counterparty: "스타벅스 강남점", amount: -6_000 }),
    ]);
    expect(result[0].category).toBe("식비");
  });

  it("매칭되지 않는 가맹점은 기타로 분류한다", () => {
    const result = classifyExpenseTransactions([
      tx({ id: "t1", counterparty: "이름모를식당", amount: -10_000 }),
    ]);
    expect(result[0].category).toBe("기타");
  });

  it("입금(amount>=0) 거래는 무시한다", () => {
    const result = classifyExpenseTransactions([tx({ id: "t1", counterparty: "엄마", amount: 400_000 })]);
    expect(result).toHaveLength(0);
  });
});

describe("averageMonthlySpendByCategory", () => {
  it("카테고리별 총 지출을 monthCount로 나눈 월평균을 반환한다", () => {
    const result = averageMonthlySpendByCategory(
      [
        tx({ id: "t1", counterparty: "스타벅스", amount: -6_000 }),
        tx({ id: "t2", counterparty: "이디야커피", amount: -4_000 }),
        tx({ id: "t3", counterparty: "서울교통공사", amount: -2_000 }),
      ],
      2,
    );
    expect(result["식비"]).toBe(5_000); // (6000+4000)/2
    expect(result["생필품/경조사"]).toBe(1_000); // 2000/2
    expect(result["기타"]).toBe(0);
  });

  it("모든 ExpenseCategory 키를 항상 포함한다(지출이 0건인 카테고리도 0으로)", () => {
    const result = averageMonthlySpendByCategory(
      [tx({ id: "t1", counterparty: "스타벅스", amount: -6_000 })],
      1,
    );
    expect(Object.keys(result).sort()).toEqual(
      ["교육/자기계발", "기타", "문화/여가", "생필품/경조사", "쇼핑", "식비"].sort(),
    );
  });
});
