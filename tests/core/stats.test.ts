import { describe, expect, it } from "vitest";
import { boxMuller, lognormal, mulberry32, percentile, pinballLoss } from "@/core/stats";

describe("mulberry32", () => {
  it("같은 시드는 같은 수열을 만든다", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("다른 시드는 다른 수열을 만든다", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("0~1 사이 값만 반환한다", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("boxMuller", () => {
  it("대량 샘플의 평균과 표준편차가 표준정규분포(0, 1)에 근접한다", () => {
    const rng = mulberry32(123);
    const n = 50_000;
    const samples = Array.from({ length: n }, () => boxMuller(rng));
    const mean = samples.reduce((s, v) => s + v, 0) / n;
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

    expect(mean).toBeCloseTo(0, 1);
    expect(Math.sqrt(variance)).toBeCloseTo(1, 1);
  });
});

describe("lognormal", () => {
  it("10만 샘플의 평균이 이론값(exp(mu + sigma^2/2)) ±2% 이내다", () => {
    const rng = mulberry32(2026);
    const muLog = Math.log(500_000);
    const sigma = 0.3;
    const n = 100_000;

    const samples = Array.from({ length: n }, () => lognormal(rng, muLog, sigma));
    const sampleMean = samples.reduce((s, v) => s + v, 0) / n;
    const theoreticalMean = Math.exp(muLog + (sigma * sigma) / 2);

    expect(sampleMean).toBeGreaterThan(theoreticalMean * 0.98);
    expect(sampleMean).toBeLessThan(theoreticalMean * 1.02);
  });

  it("항상 양수를 반환한다", () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 1000; i++) {
      expect(lognormal(rng, Math.log(100_000), 0.5)).toBeGreaterThan(0);
    }
  });
});

describe("percentile", () => {
  it("알려진 배열에서 손계산과 일치한다", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(values, 0)).toBe(1);
    expect(percentile(values, 1)).toBe(10);
    expect(percentile(values, 0.5)).toBeCloseTo(5.5, 10);
    // idx = 0.25 * 9 = 2.25 → sorted[2] + 0.25 * (sorted[3] - sorted[2]) = 3 + 0.25 = 3.25
    expect(percentile(values, 0.25)).toBeCloseTo(3.25, 10);
  });

  it("정렬되지 않은 입력도 처리하고 원본 배열을 변경하지 않는다", () => {
    const values = [5, 1, 4, 2, 3];
    const copy = [...values];
    expect(percentile(values, 0.5)).toBe(3);
    expect(values).toEqual(copy);
  });

  it("원소가 하나면 그 값을 반환한다", () => {
    expect(percentile([42], 0.5)).toBe(42);
  });
});

describe("pinballLoss", () => {
  it("실제값이 예측보다 크면 tau * 초과분을 반환한다", () => {
    expect(pinballLoss(0.25, 100, 80)).toBeCloseTo(0.25 * 20, 10);
  });

  it("실제값이 예측보다 작으면 (1-tau) * 부족분을 반환한다", () => {
    expect(pinballLoss(0.25, 80, 100)).toBeCloseTo(0.75 * 20, 10);
  });

  it("정확히 맞추면 0을 반환한다", () => {
    expect(pinballLoss(0.25, 100, 100)).toBe(0);
  });
});
