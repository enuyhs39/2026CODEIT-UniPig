import { describe, expect, it } from "vitest";
import {
  classifyIncomeTransactions,
  normalizeCounterparty,
  type IncomeTransaction,
} from "@/core/classify";

function tx(overrides: Partial<IncomeTransaction> & { id: string }): IncomeTransaction {
  return {
    occurredAt: new Date("2025-01-05"),
    amount: 100_000,
    rawDesc: "",
    counterparty: "",
    ...overrides,
  };
}

describe("normalizeCounterparty", () => {
  it("(주) 표기를 제거한다", () => {
    expect(normalizeCounterparty("카페드림(주)")).toBe("카페드림");
  });

  it("주식회사 표기와 숫자 꼬리표를 제거한다", () => {
    expect(normalizeCounterparty("주식회사 한글기업 002")).toBe("한글기업");
  });

  it("공백/특수문자를 제거한다", () => {
    expect(normalizeCounterparty("올리브영 - 강남점!")).toBe("올리브영강남점");
  });
});

describe("classifyIncomeTransactions", () => {
  it("사용자 확정 룰과 일치하면 confidence 0.99, isUserConfirmed true", () => {
    const { events } = classifyIncomeTransactions(
      [tx({ id: "t1", rawDesc: "이상한입금", counterparty: "누군가" })],
      [{ rawDesc: "이상한입금", category: "salary" }],
    );
    expect(events[0]).toMatchObject({ category: "salary", confidence: 0.99, isUserConfirmed: true });
  });

  it("장학 키워드는 scholarship으로 분류한다", () => {
    const { events } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "국가장학재단 장학금", counterparty: "국가장학재단" }),
    ]);
    expect(events[0]).toMatchObject({ category: "scholarship", confidence: 0.85 });
  });

  it("급여/알바 키워드는 salary로 분류한다", () => {
    const { events } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "카페드림(주) 급여", counterparty: "카페드림(주)" }),
    ]);
    expect(events[0]).toMatchObject({ category: "salary", confidence: 0.85 });
  });

  it("캐시백/리워드/적립 키워드는 cashback으로 분류한다", () => {
    const { events } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "신한카드 캐시백 적립", counterparty: "신한카드" }),
    ]);
    expect(events[0]).toMatchObject({ category: "cashback", confidence: 0.85 });
  });

  it("휴리스틱: 3회 이상 + 만원단위 + 비슷한 날짜면 allowance로 분류한다", () => {
    const { events } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-01-05"), amount: 400_000 }),
      tx({ id: "t2", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-02-04"), amount: 400_000 }),
      tx({ id: "t3", rawDesc: "엄마 용돈", counterparty: "엄마", occurredAt: new Date("2025-03-06"), amount: 400_000 }),
    ]);
    expect(events.every((e) => e.category === "allowance" && e.confidence === 0.6)).toBe(true);
  });

  it("휴리스틱: 횟수가 3회 미만이면 irregular로 분류한다", () => {
    const { events } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "과외비", counterparty: "과외", amount: 300_000 }),
      tx({ id: "t2", rawDesc: "과외비", counterparty: "과외", amount: 300_000 }),
    ]);
    expect(events.every((e) => e.category === "irregular")).toBe(true);
  });

  it("휴리스틱: 금액이 만원 단위로 안 떨어지면 irregular로 분류한다", () => {
    const { events } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "과외비", counterparty: "과외", amount: 253_500 }),
      tx({ id: "t2", rawDesc: "과외비", counterparty: "과외", amount: 300_000 }),
      tx({ id: "t3", rawDesc: "과외비", counterparty: "과외", amount: 310_000 }),
    ]);
    expect(events.every((e) => e.category === "irregular")).toBe(true);
  });

  it("휴리스틱: 입금일이 들쭉날쭉하면 irregular로 분류한다", () => {
    const { events } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "과외비", counterparty: "과외", occurredAt: new Date("2025-01-02"), amount: 300_000 }),
      tx({ id: "t2", rawDesc: "과외비", counterparty: "과외", occurredAt: new Date("2025-02-20"), amount: 300_000 }),
      tx({ id: "t3", rawDesc: "과외비", counterparty: "과외", occurredAt: new Date("2025-03-11"), amount: 300_000 }),
    ]);
    expect(events.every((e) => e.category === "irregular")).toBe(true);
  });

  it("confidence 0.7 미만인 결과만 needsReview에 담긴다", () => {
    const { events, needsReview } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "국가장학재단 장학금", counterparty: "국가장학재단" }),
      tx({ id: "t2", rawDesc: "과외비", counterparty: "과외", amount: 300_000 }),
    ]);
    expect(events).toHaveLength(2);
    expect(needsReview).toHaveLength(1);
    expect(needsReview[0].txId).toBe("t2");
  });

  it("sourceId는 정규화된 counterparty와 category로 일관되게 생성된다", () => {
    const { events } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "카페드림(주) 급여", counterparty: "카페드림(주)" }),
      tx({ id: "t2", rawDesc: "카페드림(주) 급여", counterparty: "카페드림(주)" }),
    ]);
    expect(events[0].sourceId).toBe("카페드림:salary");
    expect(events[0].sourceId).toBe(events[1].sourceId);
  });

  it("지출(amount<=0) 거래는 무시한다", () => {
    const { events } = classifyIncomeTransactions([
      tx({ id: "t1", rawDesc: "스타벅스 결제", counterparty: "스타벅스", amount: -6_000 }),
    ]);
    expect(events).toHaveLength(0);
  });
});
