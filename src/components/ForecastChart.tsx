"use client";

import {
  Bar,
  BarChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastResult } from "@/core/forecast";
import { formatWon } from "@/lib/format";

type Props = {
  forecast: ForecastResult;
};

/** value가 속한 bin의 인덱스. binEdges는 오름차순, 마지막 bin은 끝값 포함. */
function binIndexForValue(value: number, binEdges: number[]): number {
  for (let i = 0; i < binEdges.length - 1; i++) {
    if (value <= binEdges[i + 1]) return i;
  }
  return binEdges.length - 2;
}

/**
 * 예측 히스토그램 + P10~P90 밴드 (T10 ★). 몬테카를로 시뮬레이션 결과(histogram/percentiles)는
 * 서버 컴포넌트에서 core/forecast.ts로 이미 계산해서 props로 받는다 — 여기선 그리기만 한다.
 * Recharts BarChart는 category축이라, 퍼센타일 값을 그 값이 속한 bin의 인덱스로 변환해서
 * ReferenceArea/Line의 x좌표로 쓴다(근사치지만 20개 bin이면 демо에 충분히 정확함).
 */
export function ForecastChart({ forecast }: Props) {
  const { histogram, percentiles } = forecast;

  const chartData = histogram.binEdges.slice(0, -1).map((edge, i) => ({
    index: i,
    binStart: edge,
    count: histogram.counts[i],
  }));

  const p10Index = binIndexForValue(percentiles.p10, histogram.binEdges);
  const p25Index = binIndexForValue(percentiles.p25, histogram.binEdges);
  const p50Index = binIndexForValue(percentiles.p50, histogram.binEdges);
  const p90Index = binIndexForValue(percentiles.p90, histogram.binEdges);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <XAxis
            dataKey="index"
            tickFormatter={(i: number) => formatWon(chartData[i]?.binStart ?? 0)}
            interval={3}
            tick={{ fontSize: 11, fill: "#2f4860" }}
          />
          <YAxis tick={{ fontSize: 11, fill: "#2f4860" }} allowDecimals={false} />
          <Tooltip
            formatter={(value) => [`${value}회`, "시뮬레이션 횟수"]}
            labelFormatter={(i) => formatWon(chartData[Number(i)]?.binStart ?? 0)}
          />
          <ReferenceArea x1={p10Index} x2={p90Index} fill="#7da7d9" fillOpacity={0.18} strokeOpacity={0} />
          <ReferenceLine x={p25Index} stroke="#2f4860" strokeDasharray="4 4" label={{ value: "P25", fontSize: 11, fill: "#2f4860" }} />
          <ReferenceLine x={p50Index} stroke="#2f4860" strokeOpacity={0.4} label={{ value: "P50", fontSize: 11, fill: "#2f4860" }} />
          <Bar dataKey="count" fill="#7da7d9" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
