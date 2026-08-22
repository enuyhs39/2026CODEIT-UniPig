/**
 * T3~T6 파이프라인을 마지막 3개월 홀드아웃으로 백테스트해서(SPEC.md 7장) 검증 지표를
 * 콘솔에 출력하고 docs/backtest.md에 결과 표를 저장한다.
 * 실행: npx tsx scripts/backtestDemo.ts
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runBacktest, type BacktestMonthResult } from "@/core/backtest";
import { lastNMonthKeys } from "@/core/dateUtils";
import { DEMO_USER_ID } from "@/config";
import { prisma } from "@/lib/prisma";

const BACKTEST_SEED = 42;
const HOLDOUT_MONTH_COUNT = 3;

function fmtWon(n: number): string {
  return `${Math.round(n).toLocaleString()}원`;
}

function toMarkdownTable(months: BacktestMonthResult[]): string {
  const header = "| 대상월 | 실제수입 | P10 | P25(기준선) | P50 | P90 | 커버리지 | 붕괴 | Pinball Loss |";
  const divider = "|---|---|---|---|---|---|---|---|---|";
  const rows = months.map(
    (m) =>
      `| ${m.targetMonth} | ${fmtWon(m.actual)} | ${fmtWon(m.predicted.p10)} | ${fmtWon(m.predicted.p25)} | ` +
      `${fmtWon(m.predicted.p50)} | ${fmtWon(m.predicted.p90)} | ${m.inCoverageBand ? "✅" : "❌"} | ` +
      `${m.budgetCollapsed ? "⚠️ 붕괴" : "-"} | ${Math.round(m.avgPinballLoss).toLocaleString()} |`,
  );
  return [header, divider, ...rows].join("\n");
}

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { occurredAt: "asc" },
  });

  const lastTxDate = transactions[transactions.length - 1].occurredAt;
  const holdoutMonths = lastNMonthKeys(lastTxDate, HOLDOUT_MONTH_COUNT);

  const summary = runBacktest(
    transactions.map((tx) => ({
      id: tx.id,
      occurredAt: tx.occurredAt,
      amount: tx.amount,
      rawDesc: tx.rawDesc,
      counterparty: tx.counterparty,
    })),
    holdoutMonths,
    BACKTEST_SEED,
  );

  console.log(`홀드아웃 대상월: ${holdoutMonths.join(", ")}\n`);
  console.table(
    summary.months.map((m) => ({
      대상월: m.targetMonth,
      실제수입: fmtWon(m.actual),
      P10: fmtWon(m.predicted.p10),
      "P25(기준선)": fmtWon(m.predicted.p25),
      P50: fmtWon(m.predicted.p50),
      P90: fmtWon(m.predicted.p90),
      커버리지: m.inCoverageBand ? "✅" : "❌",
      붕괴: m.budgetCollapsed ? "⚠️" : "-",
      PinballLoss: Math.round(m.avgPinballLoss),
    })),
  );

  console.log("\n검증 지표 요약:");
  console.log(`  커버리지: ${(summary.coverageRate * 100).toFixed(1)}% (목표 80%)`);
  console.log(`  예산 붕괴율: ${(summary.collapseRate * 100).toFixed(1)}% (목표 25% 이하)`);
  console.log(`  평균 Pinball Loss: ${Math.round(summary.avgPinballLoss).toLocaleString()}`);
  console.log(`  조정률 추이: T8(예산+피드백학습) 완료 후 추가 예정`);

  const docsDir = join(process.cwd(), "docs");
  mkdirSync(docsDir, { recursive: true });
  const md = `# 백테스트 결과

마지막 ${HOLDOUT_MONTH_COUNT}개월(${holdoutMonths.join(", ")}) 홀드아웃. 각 달 시작 이전 데이터만으로
소득원을 분류·프로파일링·예측한 뒤, 실제 수입과 비교했다. 시드 고정(${BACKTEST_SEED})으로 재현 가능.

## 월별 결과

${toMarkdownTable(summary.months)}

## 요약 지표

| 지표 | 값 | 목표 |
|---|---|---|
| 커버리지 (실제수입이 P10~P90 안에 든 비율) | ${(summary.coverageRate * 100).toFixed(1)}% | 80% |
| 예산 붕괴율 (실제수입 < P25인 비율) | ${(summary.collapseRate * 100).toFixed(1)}% | 25% 이하 |
| 평균 Pinball Loss | ${Math.round(summary.avgPinballLoss).toLocaleString()} | - |
| 조정률 추이 | T8(예산+피드백학습) 완료 후 추가 예정 | - |

실행: \`npx tsx scripts/backtestDemo.ts\`
`;
  const outPath = join(docsDir, "backtest.md");
  writeFileSync(outPath, md, "utf-8");
  console.log(`\ndocs/backtest.md 저장 완료: ${outPath}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
