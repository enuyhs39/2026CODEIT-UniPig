/**
 * T3 더미데이터 → T4 분류 → T5 프로파일링 → T6 몬테카를로 예측까지 전체 파이프라인을 이어서
 * 다음 달 총수입 분포(P10/P25/P50/P90)와 텍스트 히스토그램을 눈으로 확인한다.
 * 실행: npx tsx scripts/forecastDemo.ts
 */

import "dotenv/config";
import { classifyIncomeTransactions, type IncomeCategory } from "@/core/classify";
import { profileSource, type IncomeOccurrence } from "@/core/profiling";
import { forecastIncome, type ForecastSourceInput } from "@/core/forecast";
import { prisma } from "@/lib/prisma";

/** 로그인 없이 로컬에서 더미데이터를 돌릴 때 쓰는 테스트 유저 ID. 실제 앱은 인증된 userId를 쓴다. */
const DEMO_USER_ID = "demo-user";

const FORECAST_SEED = 42;
const HISTOGRAM_BAR_WIDTH = 40; // 텍스트 히스토그램 최대 막대 길이(문자 수)

function nextMonthKey(date: Date): string {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { occurredAt: "asc" },
  });

  const { events } = classifyIncomeTransactions(
    transactions.map((tx) => ({
      id: tx.id,
      occurredAt: tx.occurredAt,
      amount: tx.amount,
      rawDesc: tx.rawDesc,
      counterparty: tx.counterparty,
    })),
  );

  const amountByTxId = new Map(transactions.map((tx) => [tx.id, tx.amount]));
  const occurredAtByTxId = new Map(transactions.map((tx) => [tx.id, tx.occurredAt]));

  const occurrencesBySource = new Map<
    string,
    { category: IncomeCategory; occurrences: IncomeOccurrence[] }
  >();
  for (const e of events) {
    const entry = occurrencesBySource.get(e.sourceId) ?? { category: e.category, occurrences: [] };
    entry.occurrences.push({
      occurredAt: occurredAtByTxId.get(e.txId)!,
      amount: amountByTxId.get(e.txId)!,
    });
    occurrencesBySource.set(e.sourceId, entry);
  }

  const lastTxDate = transactions[transactions.length - 1].occurredAt;
  const today = new Date(lastTxDate.getTime() + 24 * 60 * 60 * 1000);
  const targetMonth = nextMonthKey(today);

  const sources: (ForecastSourceInput & { sourceId: string })[] = [];
  for (const [sourceId, { category, occurrences }] of occurrencesBySource) {
    const profile = profileSource(occurrences, today);
    if (!profile.profilable) continue;
    sources.push({
      sourceId,
      category,
      occurrenceProb: profile.occurrenceProb,
      survivalProb: profile.survivalProb,
      amountMu: profile.amountMu,
      amountSigma: profile.amountSigma,
    });
  }

  console.log(`기준일(오늘): ${today.toISOString().slice(0, 10)} → 예측 대상월: ${targetMonth}\n`);
  console.log("예측에 사용된 소득원별 발생확률(occurrenceProb × survivalProb × 계절성 반영 전):");
  console.table(
    sources.map((s) => ({
      sourceId: s.sourceId,
      category: s.category,
      occurrenceProb: Number(s.occurrenceProb.toFixed(2)),
      survivalProb: Number(s.survivalProb.toFixed(3)),
      amountMu: Math.round(s.amountMu),
    })),
  );

  const { percentiles, histogram } = forecastIncome(sources, targetMonth, FORECAST_SEED);

  console.log(`\n${targetMonth} 총수입 예측 (10,000회 시뮬레이션):`);
  console.log(`  P10: ${Math.round(percentiles.p10).toLocaleString()}원`);
  console.log(`  P25: ${Math.round(percentiles.p25).toLocaleString()}원  ← 예산 기준선(balanced)`);
  console.log(`  P50: ${Math.round(percentiles.p50).toLocaleString()}원`);
  console.log(`  P90: ${Math.round(percentiles.p90).toLocaleString()}원`);

  console.log("\n텍스트 히스토그램:");
  const maxCount = Math.max(...histogram.counts);
  for (let i = 0; i < histogram.counts.length; i++) {
    const lo = Math.round(histogram.binEdges[i]).toLocaleString();
    const hi = Math.round(histogram.binEdges[i + 1]).toLocaleString();
    const barLen = maxCount === 0 ? 0 : Math.round((histogram.counts[i] / maxCount) * HISTOGRAM_BAR_WIDTH);
    const bar = "#".repeat(barLen);
    console.log(`  ${lo.padStart(10)} ~ ${hi.padStart(10)} | ${bar} ${histogram.counts[i]}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
