/**
 * 온보딩(예산 화면 첫 진입 게이트) 제출. POST /api/onboarding
 * { fixedExpenses: Record<FixedExpenseCategory, number>, savingRate: number(0~1), csv: string }
 * CSV를 먼저 파싱해서 실패하면 아무것도 안 쓰고 끝내고, 성공하면 FixedExpense 4행 + UserPreference +
 * Transaction/IncomeEvent를 한 $transaction 안에서 전부-아니면-전무로 커밋한다.
 * UserPreference row의 존재 자체가 "온보딩 완료" 판정 기준이다 (budget/page.tsx 참고).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { parseTransactionCsv } from "@/core/parseCsv";
import { ingestTransactionsForUser } from "@/lib/ingestTransactionsForUser";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BUDGET_WEIGHTS } from "@/config";
import { FixedExpenseCategory } from "@/generated/prisma/client";

const onboardingSchema = z.object({
  fixedExpenses: z.object({
    TRANSPORT: z.number().min(0),
    RENT: z.number().min(0),
    PHONE: z.number().min(0),
    SUBSCRIPTION: z.number().min(0),
  }),
  savingRate: z.number().min(0).max(1),
  csv: z.string().min(1),
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해주세요" }, { status: 400 });
  }
  const { fixedExpenses, savingRate, csv } = parsed.data;

  // 계정 생성 전 실패시키려는 게 아니라(이미 계정은 있음) DB 트랜잭션을 열기 전에 먼저 걸러내는 것 —
  // 파싱 실패면 $transaction 자체를 시작하지 않는다.
  try {
    parseTransactionCsv(csv);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.fixedExpense.createMany({
        data: (Object.entries(fixedExpenses) as [FixedExpenseCategory, number][]).map(([category, amount]) => ({
          userId,
          category,
          amount,
        })),
      });
      await tx.userPreference.create({
        data: { userId, weights: DEFAULT_BUDGET_WEIGHTS, savingRate },
      });
      await ingestTransactionsForUser(tx, userId, csv);
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  return NextResponse.json({ onboarded: true });
}
