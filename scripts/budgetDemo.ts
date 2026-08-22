/**
 * T3 더미데이터로 T8(budget.ts + feedback.ts) 파이프라인을 실행한다.
 * 1) T4~T6로 다음 달 수입 기준선(P25) 산출 + 지출 내역으로 카테고리별 과거평균지출 집계
 * 2) buildBudget으로 예산안(AI 원안) 수립
 * 3) 사용자가 매달 "카페"만 15만원으로 고쳐 확정한다고 가정하고 3회 반복
 * 4) 회차마다 AI 원안의 카페 배분이 사용자 목표(15만원)에 "조금씩만" 가까워지는지 확인
 *
 * 실행: npx tsx scripts/budgetDemo.ts
 */

import "dotenv/config";
import { classifyIncomeTransactions, type IncomeTransaction } from "@/core/classify";
import { profileSource, type IncomeOccurrence } from "@/core/profiling";
import { forecastIncome, type ForecastSourceInput, type Percentiles } from "@/core/forecast";
import { averageMonthlySpendByCategory } from "@/core/classifyExpense";
import { buildBudget } from "@/core/budget";
import { updateWeightsFromConfirmation } from "@/core/feedback";
import {
  BASE_INCOME_QUANTILES,
  DEFAULT_BUDGET_PROFILE,
  DEFAULT_SAVING_RATE,
  DEMO_USER_ID,
  type ExpenseCategory,
} from "@/config";
import { prisma } from "@/lib/prisma";

const FORECAST_SEED = 42;
const SIMULATION_ROUNDS = 3;
const USER_CAFE_OVERRIDE = 150_000; // 사용자가 매 회차 "카페"만 15만원으로 고쳐 확정한다고 가정
const CATEGORIES: ExpenseCategory[] = ["식비", "카페", "쇼핑", "교통", "기타"];

// 고정지출(월세 등)을 넣을 데이터 소스가 아직 없다(스키마에 모델 없음, T9/T10에서 사용자 입력으로 받을 예정).
// 데모에서는 0으로 두고 이 사실을 그대로 출력에 남긴다 — 값을 지어내지 않는다.
const FIXED_EXPENSES = 0;

function fmtWon(n: number): string {
  return `${Math.round(n).toLocaleString()}원`;
}

/** "YYYY-MM" 문자열에서 다음 달 키를 만든다. */
function nextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month, 1)); // month(0-indexed)+1 = 다음달 1일
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** BASE_INCOME_QUANTILES[DEFAULT_BUDGET_PROFILE]에 대응하는 percentile 값을 고른다. */
function pickBaseIncome(percentiles: Percentiles): number {
  const q = BASE_INCOME_QUANTILES[DEFAULT_BUDGET_PROFILE];
  if (q === 0.1) return percentiles.p10;
  if (q === 0.25) return percentiles.p25;
  return percentiles.p50;
}

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { occurredAt: "asc" },
  });

  const lastTxDate = transactions[transactions.length - 1].occurredAt;
  const monthKeys = new Set(
    transactions.map((tx) => `${tx.occurredAt.getUTCFullYear()}-${String(tx.occurredAt.getUTCMonth() + 1).padStart(2, "0")}`),
  );
  const targetMonth = nextMonthKey([...monthKeys].sort().at(-1)!);

  // 1) 수입 기준선(T4→T5→T6)
  const incomeTx: IncomeTransaction[] = transactions.map((tx) => ({
    id: tx.id,
    occurredAt: tx.occurredAt,
    amount: tx.amount,
    rawDesc: tx.rawDesc,
    counterparty: tx.counterparty,
  }));
  const { events } = classifyIncomeTransactions(incomeTx);

  const amountByTxId = new Map(incomeTx.map((tx) => [tx.id, tx.amount]));
  const occurredAtByTxId = new Map(incomeTx.map((tx) => [tx.id, tx.occurredAt]));
  const occurrencesBySource = new Map<string, IncomeOccurrence[]>();
  for (const e of events) {
    const list = occurrencesBySource.get(e.sourceId) ?? [];
    list.push({ occurredAt: occurredAtByTxId.get(e.txId)!, amount: amountByTxId.get(e.txId)! });
    occurrencesBySource.set(e.sourceId, list);
  }

  const forecastSources: ForecastSourceInput[] = [];
  for (const [sourceId, occurrences] of occurrencesBySource) {
    const profile = profileSource(occurrences, lastTxDate);
    if (!profile.profilable) continue;
    const category = events.find((e) => e.sourceId === sourceId)!.category;
    forecastSources.push({
      category,
      occurrenceProb: profile.occurrenceProb,
      survivalProb: profile.survivalProb,
      amountMu: profile.amountMu,
      amountSigma: profile.amountSigma,
    });
  }

  const { percentiles } = forecastIncome(forecastSources, targetMonth, FORECAST_SEED);
  const baseIncome = pickBaseIncome(percentiles);

  // 2) 카테고리별 과거평균지출(T8 classifyExpense.ts) — 12개월 데이터 전체 평균
  const categoryHistoricalSpend = averageMonthlySpendByCategory(
    transactions.map((tx) => ({ id: tx.id, occurredAt: tx.occurredAt, amount: tx.amount, rawDesc: tx.rawDesc, counterparty: tx.counterparty })),
    monthKeys.size,
  );

  console.log(`대상월: ${targetMonth} (프로필: ${DEFAULT_BUDGET_PROFILE}, 기준선 ${fmtWon(baseIncome)})`);
  console.log(`고정지출: ${fmtWon(FIXED_EXPENSES)} (스키마에 모델 없음 — 데모에서는 0으로 고정, T9/T10에서 사용자 입력 예정)`);
  console.log("\n카테고리별 월평균 과거지출:");
  console.table(Object.fromEntries(CATEGORIES.map((c) => [c, fmtWon(categoryHistoricalSpend[c])])));

  // 3) 예산 수립 → 사용자가 매 회차 카페만 15만원으로 확정 → 피드백 학습 3회 반복
  let weights: Record<ExpenseCategory, number> = Object.fromEntries(CATEGORIES.map((c) => [c, 1])) as Record<
    ExpenseCategory,
    number
  >;

  const rounds: {
    회차: number;
    "AI원안(카페)": string;
    "사용자확정(카페)": string;
    "격차(목표-AI)": string;
    "카페weight(확정후)": string;
  }[] = [];

  for (let round = 1; round <= SIMULATION_ROUNDS; round++) {
    const result = buildBudget({
      baseIncome,
      fixedExpenses: FIXED_EXPENSES,
      categoryHistoricalSpend,
      userWeights: weights,
      savingRate: DEFAULT_SAVING_RATE,
    });

    if (result.status !== "DRAFT") {
      throw new Error(`예상치 못한 DEFICIT_ALERT: ${JSON.stringify(result)}`);
    }

    if (round === 1) {
      console.log("\n1회차 AI 원안 전체 배분:");
      console.table(Object.fromEntries(CATEGORIES.map((c) => [c, fmtWon(result.allocations[c])])));
      console.log(`저축: ${fmtWon(result.saving)}`);
    }

    const aiAllocations = result.allocations;
    const userAllocations = { ...aiAllocations, 카페: USER_CAFE_OVERRIDE };

    weights = updateWeightsFromConfirmation(weights, aiAllocations, userAllocations) as Record<
      ExpenseCategory,
      number
    >;

    rounds.push({
      회차: round,
      "AI원안(카페)": fmtWon(aiAllocations.카페),
      "사용자확정(카페)": fmtWon(USER_CAFE_OVERRIDE),
      "격차(목표-AI)": fmtWon(USER_CAFE_OVERRIDE - aiAllocations.카페),
      "카페weight(확정후)": weights.카페.toFixed(4),
    });
  }

  console.log(`\n${SIMULATION_ROUNDS}개월 시뮬레이션 (매달 카페를 ${fmtWon(USER_CAFE_OVERRIDE)}으로 확정):`);
  console.table(rounds);

  const gaps = rounds.map((r) => Number(r["격차(목표-AI)"].replace(/[^\d-]/g, "")));
  const isMonotonicallyShrinking = gaps.every((g, i) => i === 0 || g < gaps[i - 1]);
  console.log(
    `\n격차(목표-AI) 추이: ${gaps.map(fmtWon).join(" → ")} — ${isMonotonicallyShrinking ? "회차마다 감소함 ✅" : "감소하지 않음 ⚠️"}`,
  );
  console.log("(= '조정률 추이': 사용자가 고쳐야 하는 폭이 회차마다 줄어드는 것으로 확인 — docs/backtest.md 갱신용)");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
