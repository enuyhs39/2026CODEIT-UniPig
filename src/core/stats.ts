/** 시드 고정 PRNG. 같은 시드는 항상 같은 난수열을 만든다 — 백테스트 재현성의 전제조건. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller 변환. 균등분포 rng() 두 번으로 표준정규분포(평균 0, 표준편차 1) 값 하나를 만든다. */
export function boxMuller(rng: () => number): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * 로그정규분포 샘플링. muLog는 이미 로그스케일 평균(= log(amount_mu)), sigma도 로그스케일.
 * SPEC.md 4장: lognormal(log(amount_mu), amount_sigma) 형태로 호출한다.
 */
export function lognormal(rng: () => number, muLog: number, sigma: number): number {
  return Math.exp(muLog + sigma * boxMuller(rng));
}

/** 분위수(선형보간, numpy 기본 방식과 동일). p는 0~1 사이 분수. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    throw new Error("percentile: values must not be empty");
  }
  if (p < 0 || p > 1) {
    throw new Error("percentile: p must be between 0 and 1");
  }

  const sorted = [...values].sort((a, b) => a - b);
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) {
    return sorted[lo];
  }
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

/**
 * 문자열을 32비트 정수 시드로 해싱한다(FNV-1a). `userId:targetMonth` 같은 키를 시드로 바꿔
 * Route Handler가 매번 Math.random 없이도, 같은 달은 항상 같은 예측을, 다른 달은 다른 예측을 만들게 한다.
 */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 분위수 예측 채점(Pinball Loss). tau는 예측한 분위수(예: P25 → 0.25). */
export function pinballLoss(tau: number, actual: number, predicted: number): number {
  const diff = actual - predicted;
  return diff >= 0 ? tau * diff : (tau - 1) * diff;
}
