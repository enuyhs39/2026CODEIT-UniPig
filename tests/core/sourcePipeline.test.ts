import { describe, expect, it } from "vitest";
import { buildProfiledSources } from "@/core/sourcePipeline";
import type { IncomeTransaction } from "@/core/classify";

function tx(overrides: Partial<IncomeTransaction> & { id: string }): IncomeTransaction {
  return {
    occurredAt: new Date("2025-01-05"),
    amount: 100_000,
    rawDesc: "",
    counterparty: "",
    ...overrides,
  };
}

describe("buildProfiledSources", () => {
  it("소득원별로 묶어서 프로파일링한 결과를 반환한다", () => {
    const result = buildProfiledSources(
      [
        tx({ id: "t1", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-01-05"), amount: 400_000 }),
        tx({ id: "t2", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-02-05"), amount: 400_000 }),
        tx({ id: "t3", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-03-05"), amount: 400_000 }),
      ],
      [],
      new Date("2025-03-10"),
    );

    expect(result).toHaveLength(1);
    expect(result[0].sourceId).toBe("엄마:allowance");
    expect(result[0].category).toBe("allowance");
    expect(result[0].profile.periodDays).toBeCloseTo(29.5, 1); // median(31일, 28일)
  });

  it("입금이 2건 미만인 소득원은 결과에서 제외한다(프로파일링 불가)", () => {
    const result = buildProfiledSources(
      [tx({ id: "t1", rawDesc: "과외비", counterparty: "과외", amount: 300_000 })],
      [],
      new Date("2025-01-10"),
    );
    expect(result).toHaveLength(0);
  });

  it("여러 소득원을 독립적으로 프로파일링한다", () => {
    const result = buildProfiledSources(
      [
        tx({ id: "t1", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-01-05"), amount: 400_000 }),
        tx({ id: "t2", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-02-05"), amount: 400_000 }),
        tx({ id: "t3", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-03-05"), amount: 400_000 }),
        tx({ id: "t4", rawDesc: "국가장학재단 장학금", counterparty: "국가장학재단", occurredAt: new Date("2025-03-01"), amount: 1_000_000 }),
        tx({ id: "t5", rawDesc: "국가장학재단 장학금", counterparty: "국가장학재단", occurredAt: new Date("2025-09-01"), amount: 1_000_000 }),
      ],
      [],
      new Date("2025-09-10"),
    );

    const sourceIds = result.map((r) => r.sourceId).sort();
    expect(sourceIds).toEqual(["국가장학재단:scholarship", "엄마:allowance"]);
  });

  it("terminatedSourceIds에 포함된 소득원은 재계산 없이 alive:false로 강제 처리한다", () => {
    const result = buildProfiledSources(
      [
        tx({ id: "t1", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-01-05"), amount: 400_000 }),
        tx({ id: "t2", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-02-05"), amount: 400_000 }),
        tx({ id: "t3", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-03-05"), amount: 400_000 }),
      ],
      [],
      new Date("2025-03-10"), // periodDays 대비 elapsed가 짧아 원래는 alive:true여야 함
      new Set(["엄마:allowance"]),
    );

    expect(result[0].profile.alive).toBe(false);
    expect(result[0].profile.survivalProb).toBe(0);
    expect(result[0].profile.isOverdue).toBe(false);
  });
});
