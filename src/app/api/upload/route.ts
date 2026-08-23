/**
 * CSV 업로드 → 파싱 → 저장 → 입금 분류(classify.ts) → IncomeEvent 저장 (SPEC.md 2장).
 * curl -X POST http://localhost:3000/api/upload --data-binary @scripts/output/dummy-transactions.csv
 */

import { NextResponse } from "next/server";
import { ingestTransactionsForUser } from "@/lib/ingestTransactionsForUser";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const csv = await request.text();

  try {
    const result = await ingestTransactionsForUser(prisma, userId, csv);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
