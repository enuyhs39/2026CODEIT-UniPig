/**
 * 카테고리별 고정지출 조회/수정. 마이페이지(팀원 B)가 이 계약에 맞춰 붙인다.
 * GET  /api/preferences/fixed-expenses  -> Record<FixedExpenseCategory, number> (없는 카테고리는 0)
 * PATCH /api/preferences/fixed-expenses { category, amount } -> 카테고리 하나 upsert
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FixedExpenseCategory } from "@/generated/prisma/client";

const CATEGORIES = Object.values(FixedExpenseCategory);

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const rows = await prisma.fixedExpense.findMany({ where: { userId } });
  const result = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<FixedExpenseCategory, number>;
  for (const row of rows) {
    result[row.category] = row.amount;
  }

  return NextResponse.json(result);
}

const patchSchema = z.object({
  category: z.enum(FixedExpenseCategory),
  amount: z.number().min(0),
});

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "category와 amount가 필요합니다" }, { status: 400 });
  }
  const { category, amount } = parsed.data;

  const row = await prisma.fixedExpense.upsert({
    where: { userId_category: { userId, category } },
    update: { amount },
    create: { userId, category, amount },
  });

  return NextResponse.json(row);
}
