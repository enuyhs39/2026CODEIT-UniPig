/**
 * T3 더미 데이터(DB의 demo-user 거래)를 T4로 분류하고 T5로 프로파일링해서
 * 소득원별 주기·생존확률을 눈으로 확인한다.
 * 실행: npx tsx scripts/profilingDemo.ts
 */

import "dotenv/config";
import { classifyIncomeTransactions, type IncomeCategory } from "@/core/classify";
import { profileSource, type IncomeOccurrence } from "@/core/profiling";
import { DEMO_USER_ID, OVERDUE_ALERT_CATEGORIES } from "@/config";
import { prisma } from "@/lib/prisma";

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

  // "오늘"을 데이터셋의 마지막 거래 다음날로 잡는다 — 9월에 끊긴 카페 알바가
  // 12월 시점에는 실제로 생존확률이 떨어져 있는지 보기 위함(완료 조건의 핵심 확인 사항).
  const lastTxDate = transactions[transactions.length - 1].occurredAt;
  const today = new Date(lastTxDate.getTime() + 24 * 60 * 60 * 1000);

  console.log(`기준일(오늘): ${today.toISOString().slice(0, 10)}\n`);

  const rows = Array.from(occurrencesBySource.entries()).map(([sourceId, { category, occurrences }]) => {
    const profile = profileSource(occurrences, today);
    if (!profile.profilable) {
      return { sourceId, category, 건수: occurrences.length, 상태: "프로파일링 불가(2건 미만)" };
    }
    return {
      sourceId,
      category,
      건수: occurrences.length,
      주기일: Number(profile.periodDays.toFixed(1)),
      주기신뢰도: Number(profile.periodConfidence.toFixed(2)),
      매월일자: profile.typicalDom,
      평균금액: Math.round(profile.amountMu),
      발생확률: Number(profile.occurrenceProb.toFixed(2)),
      마지막입금: profile.lastSeen.toISOString().slice(0, 10),
      경과일: Math.round(profile.elapsedDays),
      생존확률: Number(profile.survivalProb.toFixed(3)),
      생존: profile.alive ? "🟢 alive" : "🔴 dead",
      // isOverdue는 카테고리 무관 순수 계산값이지만, 카드 노출은 용돈/알바 등
      // "정기적으로 들어와야 하는" 카테고리로만 한정한다(OVERDUE_ALERT_CATEGORIES).
      지연알림:
        profile.isOverdue && OVERDUE_ALERT_CATEGORIES.includes(category) ? "⚠️ overdue" : "-",
    };
  });

  console.log("소득원별 프로파일:");
  console.table(rows);

  const cafeSources = rows.filter((r) => r.category === "salary");
  if (cafeSources.length > 0) {
    console.log("\n카페 알바(salary) 생존확률 확인 — 9월부터 입금이 끊겼으므로 낮게 나와야 함:");
    console.table(cafeSources);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
