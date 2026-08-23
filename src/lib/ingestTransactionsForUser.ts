/**
 * CSV 파싱 → Transaction 저장 → 입금 분류 → IncomeEvent 저장.
 * POST /api/upload와 POST /api/onboarding이 공유한다 — onboarding 쪽은 $transaction 콜백 안의
 * tx 클라이언트를 넘겨서 부르므로, 인자로 받는 클라이언트 타입은 PrismaClient | Prisma.TransactionClient 둘 다 허용한다.
 */

import { classifyIncomeTransactions, type IncomeTransaction } from "@/core/classify";
import { parseTransactionCsv } from "@/core/parseCsv";
import type { Prisma } from "@/generated/prisma/client";

type PrismaLike = Pick<Prisma.TransactionClient, "transaction" | "incomeEvent">;

export async function ingestTransactionsForUser(client: PrismaLike, userId: string, csv: string) {
  if (!csv.trim()) {
    throw new Error("빈 CSV입니다");
  }

  const rows = parseTransactionCsv(csv);
  if (rows.length === 0) {
    throw new Error("파싱된 거래가 없습니다");
  }

  await client.transaction.createMany({
    data: rows.map((r) => ({ userId, ...r })),
  });

  const allTx = await client.transaction.findMany({ where: { userId } });
  const incomeTx: IncomeTransaction[] = allTx.map((tx) => ({
    id: tx.id,
    occurredAt: tx.occurredAt,
    amount: tx.amount,
    rawDesc: tx.rawDesc,
    counterparty: tx.counterparty,
  }));

  const confirmed = await client.incomeEvent.findMany({
    where: { isUserConfirmed: true, transaction: { userId } },
    include: { transaction: true },
  });
  const userRules = confirmed.map((e) => ({ rawDesc: e.transaction.rawDesc, category: e.category }));

  const { events, needsReview } = classifyIncomeTransactions(incomeTx, userRules);

  // 이미 IncomeEvent가 있는 거래(과거 업로드분)는 skipDuplicates로 건드리지 않고, 새로 들어온 거래만 저장한다.
  await client.incomeEvent.createMany({
    data: events.map((e) => ({
      txId: e.txId,
      sourceId: e.sourceId,
      category: e.category,
      confidence: e.confidence,
      isUserConfirmed: e.isUserConfirmed,
    })),
    skipDuplicates: true,
  });

  return {
    uploaded: rows.length,
    totalTransactions: allTx.length,
    classifiedIncomeEvents: events.length,
    needsReview,
  };
}
