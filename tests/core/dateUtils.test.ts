import { describe, expect, it } from "vitest";
import { lastNMonthKeys, nextMonthKey, toMonthKey } from "@/core/dateUtils";

describe("lastNMonthKeys", () => {
  it("연도를 넘어가는 마지막 3개월을 오래된 순으로 반환한다", () => {
    expect(lastNMonthKeys(new Date(Date.UTC(2026, 0, 15)), 3)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("n=1이면 lastDate가 속한 달만 반환한다", () => {
    expect(lastNMonthKeys(new Date(Date.UTC(2025, 11, 31)), 1)).toEqual(["2025-12"]);
  });
});

describe("nextMonthKey", () => {
  it("12월의 다음 달은 다음 해 1월이다", () => {
    expect(nextMonthKey("2025-12")).toBe("2026-01");
  });

  it("일반적인 경우 월만 증가한다", () => {
    expect(nextMonthKey("2025-05")).toBe("2025-06");
  });
});

describe("toMonthKey", () => {
  it("Date를 YYYY-MM 문자열로 변환한다", () => {
    expect(toMonthKey(new Date(Date.UTC(2025, 8, 1)))).toBe("2025-09");
  });
});
