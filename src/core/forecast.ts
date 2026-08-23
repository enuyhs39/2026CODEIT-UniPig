/**
 * 수입 예측 몬테카를로 시뮬레이터 (SPEC.md 4장).
 * DB 접근 없는 순수 함수 — 소득원 프로파일(T5)을 입력으로 받아 다음 달 총수입 분포를 만든다.
 */

import { lognormal, mulberry32, percentile } from "./stats";
import type { IncomeCategory } from "./classify";
import { HISTOGRAM_BINS, MONTE_CARLO_SIMULATIONS, SEASONAL_FACTORS } from "@/config";

// 시뮬레이션 입력: 소득원 하나. profileSource(T5) 결과 중 예측에 필요한 값만 뽑아 쓴다.
export type ForecastSourceInput = {
  category: IncomeCategory;
  occurrenceProb: number;
  survivalProb: number;
  amountMu: number;
  amountSigma: number;
};

export type Percentiles = {
  p10: number;
  p25: number;
  p50: number;
  p90: number;
};

// 미리 구간을 나눠 반환하는 히스토그램. binEdges[i]~binEdges[i+1] 구간의 개수가 counts[i].
export type Histogram = {
  binEdges: number[];
  counts: number[];
};

export type ForecastResult = {
  percentiles: Percentiles;
  histogram: Histogram;
};

export type ForecastOptions = {
  nSim?: number;
  bins?: number;
};

/** SEASONAL_FACTORS에서 카테고리·월에 해당하는 계절성 계수를 조회한다. 없으면 default. */
function seasonalFactor(category: IncomeCategory, month: number): number {
  const cfg = SEASONAL_FACTORS[category];
  return (cfg.months as Record<number, number>)[month] ?? cfg.default;
}

/** "YYYY-MM" 형식의 targetMonth에서 월(1~12) 숫자만 뽑아낸다. */
function monthOf(targetMonth: string): number {
  return Number(targetMonth.split("-")[1]);
}

function buildHistogram(samples: number[], bins: number): Histogram {
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = max - min || 1; // 모든 샘플이 동일값이면 0 나눗셈 방지

  const binWidth = span / bins;
  const counts = new Array(bins).fill(0);
  for (const sample of samples) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((sample - min) / binWidth)));
    counts[idx] += 1;
  }

  const binEdges = Array.from({ length: bins + 1 }, (_, i) => min + i * binWidth);
  return { binEdges, counts };
}

/**
 * 다음 달 총수입 분포를 몬테카를로로 시뮬레이션한다.
 * seed는 필수 파라미터 — 백테스트(T7) 재현성을 위해 항상 명시적으로 넘긴다(Math.random 금지).
 */
export function forecastIncome(
  sources: ForecastSourceInput[],
  targetMonth: string,
  seed: number,
  options: ForecastOptions = {},
): ForecastResult {
  const nSim = options.nSim ?? MONTE_CARLO_SIMULATIONS;
  const bins = options.bins ?? HISTOGRAM_BINS;
  const month = monthOf(targetMonth);
  const rng = mulberry32(seed);

  // SPEC 4장 1단계: p = occurrence_prob × survival_prob × seasonal_factor, 1.0 상한
  const occurrenceProbs = sources.map((s) =>
    Math.min(1, s.occurrenceProb * s.survivalProb * seasonalFactor(s.category, month)),
  );

  const samples: number[] = new Array(nSim);
  for (let i = 0; i < nSim; i++) {
    let total = 0;
    for (let j = 0; j < sources.length; j++) {
      if (rng() < occurrenceProbs[j]) {
        total += lognormal(rng, Math.log(sources[j].amountMu), sources[j].amountSigma);
      }
    }
    samples[i] = total;
  }

  const percentiles: Percentiles = {
    p10: percentile(samples, 0.1),
    p25: percentile(samples, 0.25),
    p50: percentile(samples, 0.5),
    p90: percentile(samples, 0.9),
  };

  return { percentiles, histogram: buildHistogram(samples, bins) };
}
