/**
 * Route Handler 3곳(sources/forecast/budget draft)이 공통으로 필요로 하는 "DEMO_USER_ID의
 * 입금 거래 + 사용자 확정 룰" 조회를 한 곳에 모은다. prisma를 직접 다루므로 src/core에는 안 둔다.
 */

import type { IncomeTransaction, UserRule } from "@/core/classify";
import { DEMO_USER_ID } from "@/config";
import { prisma } from "./prisma";

export async function loadIncomeTransactionsAndRules(): Promise<{
  transactions: IncomeTransaction[];
  userRules: UserRule[];
}> {
  const rows = await prisma.transaction.findMany({ where: { userId: DEMO_USER_ID } });
  const transactions: IncomeTransaction[] = rows.map((tx) => ({
    id: tx.id,
    occurredAt: tx.occurredAt,
    amount: tx.amount,
    rawDesc: tx.rawDesc,
    counterparty: tx.counterparty,
  }));

  // 과거에 사용자가 직접 확정한 분류는 classify.ts의 1순위 룰로 다시 넘겨서, 재분류해도 같은 결과가 나오게 한다.
  const confirmed = await prisma.incomeEvent.findMany({
    where: { isUserConfirmed: true, transaction: { userId: DEMO_USER_ID } },
    include: { transaction: true },
  });
  const userRules: UserRule[] = confirmed.map((e) => ({ rawDesc: e.transaction.rawDesc, category: e.category }));

  return { transactions, userRules };
}

/** 사용자가 "종료 확정"한 소득원 ID 목록 — sourcePipeline.ts의 buildProfiledSources에 그대로 넘긴다. */
export async function loadTerminatedSourceIds(): Promise<Set<string>> {
  const rows = await prisma.sourceTermination.findMany({ where: { userId: DEMO_USER_ID } });
  return new Set(rows.map((r) => r.sourceId));
}

/** 소득원 하나를 "종료 확정"으로 기록한다. 이미 확정된 소득원이면 그대로 둔다(confirmedAt 갱신 안 함). */
export async function terminateSource(sourceId: string): Promise<void> {
  await prisma.sourceTermination.upsert({
    where: { sourceId },
    update: {},
    create: { sourceId, userId: DEMO_USER_ID },
  });
}
