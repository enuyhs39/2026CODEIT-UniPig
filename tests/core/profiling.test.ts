import { describe, expect, it } from "vitest";
import { profileSource, type IncomeOccurrence } from "@/core/profiling";

function occ(dateStr: string, amount = 400_000): IncomeOccurrence {
  return { occurredAt: new Date(dateStr), amount };
}

function everyNDays(count: number, n: number, amount = 400_000, startMs = Date.parse("2025-01-05")): IncomeOccurrence[] {
  return Array.from({ length: count }, (_, i) => ({
    occurredAt: new Date(startMs + i * n * 24 * 60 * 60 * 1000),
    amount,
  }));
}

describe("profileSource", () => {
  it("입금이 2건 미만이면 프로파일링 불가로 표시한다", () => {
    expect(profileSource([])).toEqual({ profilable: false });
    expect(profileSource([occ("2025-01-05")])).toEqual({ profilable: false });
  });

  it("완벽히 규칙적인 입력이면 periodConfidence가 0.9를 넘는다", () => {
    const result = profileSource(everyNDays(6, 30));
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.periodConfidence).toBeGreaterThan(0.9);
    expect(result.periodDays).toBe(30);
  });

  it("월 주기(26~34일)이면 typicalDom을 채운다", () => {
    const result = profileSource([occ("2025-01-05"), occ("2025-02-05"), occ("2025-03-05"), occ("2025-04-05")]);
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.typicalDom).toBe(5);
  });

  it("월 주기가 아니면(예: 격주) typicalDom이 null이다", () => {
    const result = profileSource(everyNDays(6, 14));
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.typicalDom).toBeNull();
  });

  it("금액은 로그정규 가정으로 amountMu/amountSigma를 계산한다", () => {
    const result = profileSource(everyNDays(6, 30, 500_000));
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.amountMu).toBeCloseTo(500_000, 0);
    expect(result.amountSigma).toBeGreaterThanOrEqual(0.05); // 완전 균일해도 최소값으로 클램프
  });

  it("2주기 이상 미입금이면 survivalProb이 0.3 미만으로 떨어진다", () => {
    const occurrences = everyNDays(6, 30, 400_000, Date.parse("2025-01-01"));
    const lastSeen = occurrences[occurrences.length - 1].occurredAt;
    const today = new Date(lastSeen.getTime() + 61 * 24 * 60 * 60 * 1000); // period(30일) 기준 2주기 조금 지남
    const result = profileSource(occurrences, today);
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.survivalProb).toBeLessThan(0.3);
  });

  it("훨씬 더 오래 미입금이면(0.15 미만) alive가 false로 마킹된다", () => {
    const occurrences = everyNDays(6, 30, 400_000, Date.parse("2025-01-01"));
    const lastSeen = occurrences[occurrences.length - 1].occurredAt;
    const today = new Date(lastSeen.getTime() + 100 * 24 * 60 * 60 * 1000);
    const result = profileSource(occurrences, today);
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.survivalProb).toBeLessThan(0.15);
    expect(result.alive).toBe(false);
    expect(result.isOverdue).toBe(false); // dead면 "지연"이 아니라 "종료 추정" 상태
  });

  it("최근에 계속 들어온 소득원은 survivalProb이 1.0이고 alive이며 isOverdue가 아니다", () => {
    const occurrences = everyNDays(6, 30, 400_000, Date.parse("2025-01-01"));
    const lastSeen = occurrences[occurrences.length - 1].occurredAt;
    const today = new Date(lastSeen.getTime() + 5 * 24 * 60 * 60 * 1000); // grace 범위(1.2주기) 안
    const result = profileSource(occurrences, today);
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.survivalProb).toBe(1.0);
    expect(result.alive).toBe(true);
    expect(result.elapsedDays).toBe(5);
    expect(result.isOverdue).toBe(false);
  });

  it("주기 1회분은 지났지만 아직 dead는 아닌 경고 구간이면 isOverdue가 true다", () => {
    const occurrences = everyNDays(6, 30, 400_000, Date.parse("2025-01-01"));
    const lastSeen = occurrences[occurrences.length - 1].occurredAt;
    const today = new Date(lastSeen.getTime() + 35 * 24 * 60 * 60 * 1000); // periodDays(30) 초과, 아직 grace(1.2주기=36일) 안
    const result = profileSource(occurrences, today);
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.survivalProb).toBe(1.0); // grace 구간이라 아직 안 흔들림
    expect(result.alive).toBe(true);
    expect(result.isOverdue).toBe(true); // 하지만 지연 알림은 떠야 함
  });

  it("발생확률: 매 주기 빠짐없이 들어오면 occurrenceProb이 1.0에 가깝다", () => {
    const result = profileSource(everyNDays(6, 30));
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.occurrenceProb).toBeCloseTo(1.0, 5);
  });

  it("발생확률: 관측 기간 대비 실제 발생 건수가 적으면 occurrenceProb이 1.0보다 작다(과외처럼 불규칙)", () => {
    // 30일 주기로 두 번 들어오다 중간에 두 달을 건너뛰고 다시 들어옴 → 기대 발생 6건 중 4건만 실제 발생
    const result = profileSource([
      occ("2025-01-05", 300_000),
      occ("2025-02-04", 300_000),
      occ("2025-03-06", 300_000),
      occ("2025-06-04", 300_000),
    ]);
    expect(result.profilable).toBe(true);
    if (!result.profilable) return;
    expect(result.occurrenceProb).toBeLessThan(1.0);
  });
});
