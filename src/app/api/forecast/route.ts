/**
 * 다음 달 수입 예측 (SPEC.md 4장). GET /api/forecast?month=YYYY-MM
 * seed는 hashSeed(userId:month)로 결정 — 같은 달을 다시 조회하면 항상 같은 분포가 나오되(재현성),
 * 달마다는 다른 시뮬레이션이 나오게 한다(고정 상수 시드 하나만 쓰면 모든 달이 똑같이 재현되어 버림).
 */

import { NextRequest, NextResponse } from "next/server";
import { buildProfiledSources } from "@/core/sourcePipeline";
import { forecastIncome, type ForecastSourceInput } from "@/core/forecast";
import { hashSeed } from "@/core/stats";
import { loadIncomeTransactionsAndRules } from "@/lib/incomeData";
import { getCurrentUserId } from "@/lib/session";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const month = request.nextUrl.searchParams.get("month");
  if (!month || !MONTH_PATTERN.test(month)) {
    return NextResponse.json({ error: "month 쿼리 파라미터가 YYYY-MM 형식으로 필요합니다" }, { status: 400 });
  }

  const { transactions, userRules } = await loadIncomeTransactionsAndRules(userId);
  const sources = buildProfiledSources(transactions, userRules, new Date());

  const forecastSources: ForecastSourceInput[] = sources.map((s) => ({
    category: s.category,
    occurrenceProb: s.profile.occurrenceProb,
    survivalProb: s.profile.survivalProb,
    amountMu: s.profile.amountMu,
    amountSigma: s.profile.amountSigma,
  }));

  const seed = hashSeed(`${userId}:${month}`);
  const result = forecastIncome(forecastSources, month, seed);

  return NextResponse.json(result);
}
