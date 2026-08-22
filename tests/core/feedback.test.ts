import { describe, expect, it } from "vitest";
import { applyExecutionCorrection, updateWeightsFromConfirmation } from "@/core/feedback";

describe("updateWeightsFromConfirmation", () => {
  it("ratio=1.5(사용자가 AI원안보다 많이 배분)면 weight를 EMA(0.75/0.25)로 끌어올리고 전체 평균 1.0으로 정규화한다", () => {
    const result = updateWeightsFromConfirmation({ 카페: 1, 쇼핑: 1 }, { 카페: 100_000 }, { 카페: 150_000 });
    // pre-norm: 카페=1*0.75+1.5*0.25=1.125, 쇼핑=1(안건드림) → mean=1.0625
    expect(result.카페).toBeCloseTo(1.125 / 1.0625, 6);
    expect(result.쇼핑).toBeCloseTo(1 / 1.0625, 6);
  });

  it("ratio가 2.0을 넘으면 2.0으로 클램프한다", () => {
    const result = updateWeightsFromConfirmation({ 카페: 1, 쇼핑: 1 }, { 카페: 100_000 }, { 카페: 500_000 });
    // raw ratio=5.0 → clip 2.0, pre-norm 카페=1*0.75+2.0*0.25=1.25 → mean=1.125
    expect(result.카페).toBeCloseTo(1.25 / 1.125, 6);
  });

  it("ratio가 0.5 미만이면 0.5로 클램프한다", () => {
    const result = updateWeightsFromConfirmation({ 카페: 1, 쇼핑: 1 }, { 카페: 100_000 }, { 카페: 10_000 });
    // raw ratio=0.1 → clip 0.5, pre-norm 카페=1*0.75+0.5*0.25=0.875 → mean=0.9375
    expect(result.카페).toBeCloseTo(0.875 / 0.9375, 6);
  });

  it("ai_alloc <= 0인 카테고리는 학습에서 제외(skip)한다", () => {
    const result = updateWeightsFromConfirmation({ 카페: 1, 쇼핑: 1 }, { 카페: 0 }, { 카페: 999_999 });
    expect(result.카페).toBe(1);
    expect(result.쇼핑).toBe(1);
  });

  it("같은 방향으로 4회 연속 조정하면 weight가 목표 ratio의 80% 이상까지 수렴한다", () => {
    let weights: Record<string, number> = { 카페: 1, 식비: 1, 쇼핑: 1, 교통: 1, 기타: 1 };
    const aiAlloc = { 카페: 100_000 };
    const userAlloc = { 카페: 150_000 }; // 사용자가 항상 AI원안의 1.5배로 조정(ratio=1.5 고정)

    for (let i = 0; i < 4; i++) {
      weights = updateWeightsFromConfirmation(weights, aiAlloc, userAlloc) as Record<string, number>;
    }

    expect(weights.카페).toBeGreaterThanOrEqual(0.8 * 1.5);
    expect(weights.카페).toBeLessThan(1.5); // 아직 목표치에 완전히 도달하지는 않음(EMA는 느리게 수렴)
  });
});

describe("applyExecutionCorrection", () => {
  it("집행률(실제지출/예산) < 0.7이면 weight에 0.9를 곱한다", () => {
    const result = applyExecutionCorrection({ 카페: 1, 쇼핑: 1 }, { 카페: 100_000, 쇼핑: 100_000 }, { 카페: 50_000, 쇼핑: 80_000 });
    expect(result.카페).toBeCloseTo(0.9, 6); // execution 0.5 < 0.7
    expect(result.쇼핑).toBe(1); // execution 0.8 >= 0.7, 변화 없음
  });

  it("집행률 보정은 정규화하지 않는다 (SPEC에 명시 없음)", () => {
    const result = applyExecutionCorrection({ 카페: 1, 쇼핑: 1 }, { 카페: 100_000 }, { 카페: 10_000 });
    expect(result.쇼핑).toBe(1); // 건드리지 않은 카테고리는 정규화로 인한 변동도 없어야 함
  });

  it("예산이 0 이하인 카테고리는 스킵한다", () => {
    const result = applyExecutionCorrection({ 카페: 1 }, { 카페: 0 }, { 카페: 100_000 });
    expect(result.카페).toBe(1);
  });
});
