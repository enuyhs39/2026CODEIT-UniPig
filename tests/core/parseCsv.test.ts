import { describe, expect, it } from "vitest";
import { parseTransactionCsv } from "@/core/parseCsv";

describe("parseTransactionCsv", () => {
  it("기본 CSV를 파싱한다", () => {
    const csv = "userId,occurredAt,amount,rawDesc,counterparty\ndemo-user,2025-01-05T00:00:00.000Z,400000,엄마 용돈,엄마\n";
    const rows = parseTransactionCsv(csv);
    expect(rows).toEqual([
      { occurredAt: new Date("2025-01-05T00:00:00.000Z"), amount: 400_000, rawDesc: "엄마 용돈", counterparty: "엄마" },
    ]);
  });

  it("컬럼 순서가 달라도 헤더 이름으로 매칭한다", () => {
    const csv = "counterparty,amount,occurredAt,rawDesc\n스타벅스,-6000,2025-01-03T00:00:00.000Z,스타벅스 결제\n";
    const rows = parseTransactionCsv(csv);
    expect(rows).toEqual([
      { occurredAt: new Date("2025-01-03T00:00:00.000Z"), amount: -6_000, rawDesc: "스타벅스 결제", counterparty: "스타벅스" },
    ]);
  });

  it("따옴표로 감싸진 필드의 쉼표를 그대로 보존한다", () => {
    const csv = 'userId,occurredAt,amount,rawDesc,counterparty\ndemo-user,2025-01-01T00:00:00.000Z,10000,"결제, 승인",가게\n';
    const rows = parseTransactionCsv(csv);
    expect(rows[0].rawDesc).toBe("결제, 승인");
  });

  it('이스케이프된 큰따옴표("")를 하나의 따옴표로 복원한다', () => {
    const csv = 'userId,occurredAt,amount,rawDesc,counterparty\ndemo-user,2025-01-01T00:00:00.000Z,10000,"올리브영 ""강남점""",올리브영\n';
    const rows = parseTransactionCsv(csv);
    expect(rows[0].rawDesc).toBe('올리브영 "강남점"');
  });

  it("따옴표로 감싸진 필드 안의 개행을 보존한다", () => {
    const csv = 'userId,occurredAt,amount,rawDesc,counterparty\ndemo-user,2025-01-01T00:00:00.000Z,10000,"1줄\n2줄",가게\n';
    const rows = parseTransactionCsv(csv);
    expect(rows[0].rawDesc).toBe("1줄\n2줄");
  });

  it("필수 컬럼이 없으면 에러를 던진다", () => {
    expect(() => parseTransactionCsv("userId,occurredAt,amount\ndemo-user,2025-01-01,1000\n")).toThrow();
  });

  it("빈 CSV는 빈 배열을 반환한다", () => {
    expect(parseTransactionCsv("")).toEqual([]);
  });
});
