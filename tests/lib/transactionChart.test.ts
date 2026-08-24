import { describe, expect, it } from "vitest";
import { buildTransactionChart, type TransactionChartEntry } from "@/lib/transactionChart";

const entries: TransactionChartEntry[] = [
  { amount: 50_000, categoryId: "food", categoryLabel: "식비", categoryColor: "ORANGE", isDone: false },
  { amount: 30_000, categoryId: "food", categoryLabel: "식비", categoryColor: "ORANGE", isDone: false },
  { amount: 100_000, categoryId: "saving", categoryLabel: "적금", categoryColor: "BLUE", isDone: false },
  { amount: 20_000, categoryId: "food", categoryLabel: "식비", categoryColor: "ORANGE", isDone: true },
];

describe("buildTransactionChart", () => {
  it("체크 여부에 따라 예정과 완료 지출을 분리한다", () => {
    const categories = new Set(["food", "saving"]);

    expect(buildTransactionChart(entries, categories, "pending").total).toBe(180_000);
    expect(buildTransactionChart(entries, categories, "done").total).toBe(20_000);
  });

  it("선택 해제한 카테고리를 합계와 원그래프에서 제외한다", () => {
    const result = buildTransactionChart(entries, new Set(["food"]), "pending");

    expect(result.total).toBe(80_000);
    expect(result.slices).toEqual([
      expect.objectContaining({ categoryId: "food", amount: 80_000, percentage: 100 }),
    ]);
  });

  it("카테고리를 합계가 높은 순서로 정렬한다", () => {
    const result = buildTransactionChart(entries, new Set(["food", "saving"]), "pending");

    expect(result.slices.map((slice) => slice.categoryId)).toEqual(["saving", "food"]);
  });
});
