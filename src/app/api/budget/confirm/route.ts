/**
 * 예산 확정 + 피드백 학습 (SPEC.md 6장). POST /api/budget/confirm
 * { planId: string, allocations: Record<ExpenseCategory, number> }
 * aiAllocations은 절대 덮어쓰지 않는다 — 확정 시 allocations만 갱신하고, 그 차이로 weight를 학습한다.
 */

import { NextResponse } from "next/server";
import { updateWeightsFromConfirmation } from "@/core/feedback";
import { DEFAULT_SAVING_RATE, type ExpenseCategory } from "@/config";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const planId: string | undefined = body.planId;
  const allocations: Record<ExpenseCategory, number> | undefined = body.allocations;

  if (!planId || !allocations) {
    return NextResponse.json({ error: "planId와 allocations가 필요합니다" }, { status: 400 });
  }

  const plan = await prisma.budgetPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    return NextResponse.json({ error: "예산안을 찾을 수 없습니다" }, { status: 404 });
  }

  const pref = await prisma.userPreference.findUnique({ where: { userId } });
  const currentWeights = (pref?.weights as Record<ExpenseCategory, number>) ?? {};

  const newWeights = updateWeightsFromConfirmation(
    currentWeights,
    plan.aiAllocations as Record<ExpenseCategory, number>,
    allocations,
  );

  const [updatedPlan] = await prisma.$transaction([
    prisma.budgetPlan.update({ where: { id: planId }, data: { allocations, status: "CONFIRMED" } }),
    prisma.userPreference.upsert({
      where: { userId },
      update: { weights: newWeights },
      create: { userId, weights: newWeights, savingRate: DEFAULT_SAVING_RATE },
    }),
  ]);

  return NextResponse.json(updatedPlan);
}
