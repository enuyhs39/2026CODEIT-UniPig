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
