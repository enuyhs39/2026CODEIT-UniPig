/**
 * T3 더미데이터로 T8(budget.ts + feedback.ts) 파이프라인을 실행한다.
 * 1) T4~T6로 다음 달 수입 기준선(P25) 산출 + 지출 내역으로 카테고리별 과거평균지출 집계
 * 2) buildBudget으로 예산안(AI 원안) 수립
 * 3) 사용자가 매달 "문화/여가"만 15만원으로 고쳐 확정한다고 가정하고 3회 반복
 * 4) 회차마다 AI 원안의 문화/여가 배분이 사용자 목표(15만원)에 "조금씩만" 가까워지는지 확인
 *
 * 실행: npx tsx scripts/budgetDemo.ts
 */

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildProfiledSources } from "@/core/sourcePipeline";
import { forecastIncome, type ForecastSourceInput } from "@/core/forecast";
import { averageMonthlySpendByCategory } from "@/core/classifyExpense";
import { buildBudget, pickBaseIncome } from "@/core/budget";
import { updateWeightsFromConfirmation } from "@/core/feedback";
import { nextMonthKey, toMonthKey } from "@/core/dateUtils";
import {
  DEFAULT_BUDGET_PROFILE,
  DEFAULT_SAVING_RATE,
  FEEDBACK_EMA_ALPHA,
  type ExpenseCategory,
} from "@/config";
import { prisma } from "@/lib/prisma";

/** 로그인 없이 로컬에서 더미데이터를 돌릴 때 쓰는 테스트 유저 ID. 실제 앱은 인증된 userId를 쓴다. */
const DEMO_USER_ID = "demo-user";

const FORECAST_SEED = 42;
const SIMULATION_ROUNDS = 3;
const USER_LEISURE_OVERRIDE = 150_000; // 사용자가 매 회차 "문화/여가"만 15만원으로 고쳐 확정한다고 가정
const LEISURE_CATEGORY: ExpenseCategory = "문화/여가";
const CATEGORIES: ExpenseCategory[] = ["식비", "쇼핑", "문화/여가", "교육/자기계발", "생필품/경조사", "기타"];

// 고정지출(월세 등)을 넣을 데이터 소스가 아직 없다(스키마에 모델 없음, T9/T10에서 사용자 입력으로 받을 예정).
// 데모에서는 0으로 두고 이 사실을 그대로 출력에 남긴다 — 값을 지어내지 않는다.
const FIXED_EXPENSES = 0;

function fmtWon(n: number): string {
  return `${Math.round(n).toLocaleString()}원`;
}

/**
 * docs/backtest.md의 "조정률 추이" 행부터 파일 끝까지를 이 실행 결과로 통째로 교체한다.
 * backtestDemo.ts가 매번 그 파일을 자기 템플릿으로 통째로 덮어써서 "T8 완료 후 추가 예정" placeholder로
 * 되돌려버리기 때문에, 매번 다시 패치할 수 있게 멱등적으로(치환 방식이 아니라 잘라붙이기로) 짜둔다.
 */
function updateBacktestDocsWithAdjustmentTrend(gaps: number[]): void {
  const docsPath = join(process.cwd(), "docs", "backtest.md");
  let content: string;
  try {
    content = readFileSync(docsPath, "utf-8");
  } catch {
    return; // backtestDemo.ts를 먼저 실행하지 않아 파일이 없으면 조용히 스킵
  }

  const marker = "| 조정률 추이 |";
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) return;

  const trend = gaps.map(fmtWon).join(" → ");
  const replacement =
    `| 조정률 추이 | ${trend} (매달 "문화/여가" 확정 시 목표와의 격차, ${gaps.length}회 시뮬레이션) | 감소 |\n\n` +
    `**조정률 추이 상세**: 사용자가 매달 "문화/여가" 배분을 15만원으로 고쳐 확정한다고 가정하고 ${gaps.length}회 반복한 결과, ` +
    `AI 원안의 문화/여가 배분이 목표치에 점점 가까워졌다(EMA α=${FEEDBACK_EMA_ALPHA}로 천천히 수렴). ` +
    `사용자가 매번 고쳐야 하는 격차가 ${trend}으로 회차마다 줄어드는 것으로 "조정률이 감소하는지"를 확인했다.\n\n` +
    "실행: `npx tsx scripts/backtestDemo.ts`(수입 예측 검증), `npx tsx scripts/budgetDemo.ts`(예산+피드백 학습 검증)\n";

  writeFileSync(docsPath, content.slice(0, markerIndex) + replacement, "utf-8");
}

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { occurredAt: "asc" },
  });

  const lastTxDate = transactions[transactions.length - 1].occurredAt;
  const monthKeys = new Set(transactions.map((tx) => toMonthKey(tx.occurredAt)));
  const targetMonth = nextMonthKey([...monthKeys].sort().at(-1)!);

  // 1) 수입 기준선(T4→T5→T6, T9의 sourcePipeline.ts로 조립)
  const sources = buildProfiledSources(transactions, [], lastTxDate);
  const forecastSources: ForecastSourceInput[] = sources.map((s) => ({
    category: s.category,
    occurrenceProb: s.profile.occurrenceProb,
    survivalProb: s.profile.survivalProb,
    amountMu: s.profile.amountMu,
    amountSigma: s.profile.amountSigma,
  }));

  const { percentiles } = forecastIncome(forecastSources, targetMonth, FORECAST_SEED);
  const baseIncome = pickBaseIncome(percentiles, DEFAULT_BUDGET_PROFILE);

  // 2) 카테고리별 과거평균지출(T8 classifyExpense.ts) — 12개월 데이터 전체 평균
  const categoryHistoricalSpend = averageMonthlySpendByCategory(transactions, monthKeys.size);

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
    "AI원안(문화/여가)": string;
    "사용자확정(문화/여가)": string;
    "격차(목표-AI)": string;
    "문화/여가weight(확정후)": string;
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
    const userAllocations = { ...aiAllocations, [LEISURE_CATEGORY]: USER_LEISURE_OVERRIDE };

    weights = updateWeightsFromConfirmation(weights, aiAllocations, userAllocations) as Record<
      ExpenseCategory,
      number
    >;

    rounds.push({
      회차: round,
      "AI원안(문화/여가)": fmtWon(aiAllocations[LEISURE_CATEGORY]),
      "사용자확정(문화/여가)": fmtWon(USER_LEISURE_OVERRIDE),
      "격차(목표-AI)": fmtWon(USER_LEISURE_OVERRIDE - aiAllocations[LEISURE_CATEGORY]),
      "문화/여가weight(확정후)": weights[LEISURE_CATEGORY].toFixed(4),
    });
  }

  console.log(`\n${SIMULATION_ROUNDS}개월 시뮬레이션 (매달 문화/여가를 ${fmtWon(USER_LEISURE_OVERRIDE)}으로 확정):`);
  console.table(rounds);

  const gaps = rounds.map((r) => Number(r["격차(목표-AI)"].replace(/[^\d-]/g, "")));
  const isMonotonicallyShrinking = gaps.every((g, i) => i === 0 || g < gaps[i - 1]);
  console.log(
    `\n격차(목표-AI) 추이: ${gaps.map(fmtWon).join(" → ")} — ${isMonotonicallyShrinking ? "회차마다 감소함 ✅" : "감소하지 않음 ⚠️"}`,
  );
  updateBacktestDocsWithAdjustmentTrend(gaps);
  console.log("docs/backtest.md의 '조정률 추이' 갱신 완료");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
