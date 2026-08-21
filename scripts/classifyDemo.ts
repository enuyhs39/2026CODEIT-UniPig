/**
 * T3 더미 데이터(DB의 demo-user 거래)를 실제로 분류해서 소득원별 결과를 눈으로 확인한다.
 * 실행: npx tsx scripts/classifyDemo.ts
 */

import "dotenv/config";
import { classifyIncomeTransactions } from "@/core/classify";
import { DEMO_USER_ID } from "@/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { occurredAt: "asc" },
  });

  const { events, needsReview } = classifyIncomeTransactions(
    transactions.map((tx) => ({
      id: tx.id,
      occurredAt: tx.occurredAt,
      amount: tx.amount,
      rawDesc: tx.rawDesc,
      counterparty: tx.counterparty,
    })),
  );

  const bySource = new Map<
    string,
    { category: string; count: number; confidenceSum: number; sample: string }
  >();
  for (const e of events) {
    const entry = bySource.get(e.sourceId) ?? {
      category: e.category,
      count: 0,
      confidenceSum: 0,
      sample: e.txId,
    };
    entry.count += 1;
    entry.confidenceSum += e.confidence;
    bySource.set(e.sourceId, entry);
  }

  const rawDescByTxId = new Map(transactions.map((tx) => [tx.id, tx.rawDesc]));

  console.log(`입금 거래 ${events.length}건 분류 완료 (전체 거래 ${transactions.length}건 중)\n`);

  console.log("소득원별 분류 결과:");
  console.table(
    Array.from(bySource.entries()).map(([sourceId, v]) => ({
      sourceId,
      category: v.category,
      건수: v.count,
      평균confidence: Number((v.confidenceSum / v.count).toFixed(2)),
      예시설명: rawDescByTxId.get(v.sample),
    })),
  );

  console.log(`\n확인 필요(confidence < 0.7): ${needsReview.length}건`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
