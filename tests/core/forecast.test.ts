import { describe, expect, it } from "vitest";
import { forecastIncome, type ForecastSourceInput } from "@/core/forecast";

const allowance: ForecastSourceInput = {
  category: "allowance",
  occurrenceProb: 1.0,
  survivalProb: 1.0,
  amountMu: 400_000,
  amountSigma: 0.05,
};

describe("forecastIncome", () => {
  it("같은 시드는 같은 결과를 만든다(재현성)", () => {
    const a = forecastIncome([allowance], "2025-05", 42, { nSim: 2000 });
    const b = forecastIncome([allowance], "2025-05", 42, { nSim: 2000 });
    expect(a).toEqual(b);
  });

  it("P10 <= P25 <= P50 <= P90 순서를 지킨다", () => {
    const source: ForecastSourceInput = {
      category: "salary",
      occurrenceProb: 0.8,
      survivalProb: 1.0,
      amountMu: 600_000,
      amountSigma: 0.3,
    };
    const { percentiles } = forecastIncome([source, allowance], "2025-05", 1, { nSim: 5000 });
    expect(percentiles.p10).toBeLessThanOrEqual(percentiles.p25);
    expect(percentiles.p25).toBeLessThanOrEqual(percentiles.p50);
    expect(percentiles.p50).toBeLessThanOrEqual(percentiles.p90);
  });

  it("occurrenceProb 0인 소득원은 시뮬레이션에 전혀 반영되지 않는다", () => {
    // rng() < 0은 항상 거짓이므로 이 소득원은 절대 발생하지 않는다.
    // amountMu를 극단적으로 크게 잡아서, 단 한 번이라도 발생했다면 percentile이 튀는 걸로 알 수 있다.
    const dead: ForecastSourceInput = {
      category: "salary",
      occurrenceProb: 0,
      survivalProb: 1.0,
      amountMu: 999_999_999,
      amountSigma: 0.5,
    };
    const { percentiles } = forecastIncome([allowance, dead], "2025-05", 7, { nSim: 3000 });
    expect(percentiles.p90).toBeLessThan(1_000_000); // dead가 한 번이라도 발생했다면 억 단위로 튀었을 것
  });

  it("계절성 계수가 발생확률에 반영된다: 방학월엔 중앙값이 나오고 시험월엔 0에 가깝다", () => {
    // occurrenceProb 0.5인 salary 소득원: 방학(×1.45)이면 p=0.725(>0.5)로 중앙값이 0이 아니고,
    // 시험기간(×0.6)이면 p=0.3(<0.5)으로 절반 넘게 미발생 → 중앙값이 0이다.
    const source: ForecastSourceInput = {
      category: "salary",
      occurrenceProb: 0.5,
      survivalProb: 1.0,
      amountMu: 700_000,
      amountSigma: 0.2,
    };
    const vacation = forecastIncome([source], "2025-01", 99, { nSim: 8000 }); // 1월=방학
    const examPeriod = forecastIncome([source], "2025-04", 99, { nSim: 8000 }); // 4월=시험기간

    expect(examPeriod.percentiles.p50).toBe(0);
    expect(vacation.percentiles.p50).toBeGreaterThan(0);
  });

  it("히스토그램 카운트의 총합은 시뮬레이션 횟수와 같다", () => {
    const { histogram } = forecastIncome([allowance], "2025-05", 3, { nSim: 1234 });
    const total = histogram.counts.reduce((sum, c) => sum + c, 0);
    expect(total).toBe(1234);
  });

  it("bins 옵션으로 히스토그램 구간 개수를 조절할 수 있다", () => {
    const { histogram } = forecastIncome([allowance], "2025-05", 3, { nSim: 1000, bins: 10 });
    expect(histogram.counts).toHaveLength(10);
    expect(histogram.binEdges).toHaveLength(11);
  });
});
