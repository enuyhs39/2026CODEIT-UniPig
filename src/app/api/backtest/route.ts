/**
 * 검증 지표 (SPEC.md 7장). GET /api/backtest — 마지막 3개월 홀드아웃 백테스트 결과를 반환한다.
 */

import { NextResponse } from "next/server";
import { runBacktest } from "@/core/backtest";
import { lastNMonthKeys } from "@/core/dateUtils";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const BACKTEST_SEED = 42;
const HOLDOUT_MONTH_COUNT = 3;

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { occurredAt: "asc" },
  });

  if (transactions.length === 0) {
    return NextResponse.json({ error: "거래 데이터가 없습니다. /api/upload로 먼저 업로드하세요" }, { status: 400 });
  }

  const lastTxDate = transactions[transactions.length - 1].occurredAt;
  const holdoutMonths = lastNMonthKeys(lastTxDate, HOLDOUT_MONTH_COUNT);

  const summary = runBacktest(transactions, holdoutMonths, BACKTEST_SEED);

  return NextResponse.json({ holdoutMonths, ...summary });
}
