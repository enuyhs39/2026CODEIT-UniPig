/**
 * CSV 업로드 → 파싱 → 저장 → 입금 분류(classify.ts) → IncomeEvent 저장 (SPEC.md 2장).
 * curl -X POST http://localhost:3000/api/upload --data-binary @scripts/output/dummy-transactions.csv
 */

import { NextResponse } from "next/server";
import { classifyIncomeTransactions, type IncomeTransaction } from "@/core/classify";
import { parseTransactionCsv } from "@/core/parseCsv";
import { DEMO_USER_ID } from "@/config";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const csv = await request.text();
  if (!csv.trim()) {
    return NextResponse.json({ error: "빈 CSV입니다" }, { status: 400 });
  }

  let rows;
  try {
    rows = parseTransactionCsv(csv);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "파싱된 거래가 없습니다" }, { status: 400 });
  }

  await prisma.transaction.createMany({
    data: rows.map((r) => ({ userId: DEMO_USER_ID, ...r })),
  });

  const allTx = await prisma.transaction.findMany({ where: { userId: DEMO_USER_ID } });
  const incomeTx: IncomeTransaction[] = allTx.map((tx) => ({
    id: tx.id,
    occurredAt: tx.occurredAt,
    amount: tx.amount,
    rawDesc: tx.rawDesc,
    counterparty: tx.counterparty,
  }));

  const confirmed = await prisma.incomeEvent.findMany({
    where: { isUserConfirmed: true, transaction: { userId: DEMO_USER_ID } },
    include: { transaction: true },
  });
  const userRules = confirmed.map((e) => ({ rawDesc: e.transaction.rawDesc, category: e.category }));

  const { events, needsReview } = classifyIncomeTransactions(incomeTx, userRules);

  // 이미 IncomeEvent가 있는 거래(과거 업로드분)는 skipDuplicates로 건드리지 않고, 새로 들어온 거래만 저장한다.
  await prisma.incomeEvent.createMany({
    data: events.map((e) => ({
      txId: e.txId,
      sourceId: e.sourceId,
      category: e.category,
      confidence: e.confidence,
      isUserConfirmed: e.isUserConfirmed,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    uploaded: rows.length,
    totalTransactions: allTx.length,
    classifiedIncomeEvents: events.length,
    needsReview,
  });
}
