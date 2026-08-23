/**
 * 소득원 + 프로파일 (SPEC.md 3장). GET /api/sources
 * DB에 저장하지 않고 매 요청마다 Transaction/IncomeEvent로부터 즉석에서 계산한다 —
 * survivalProb/isOverdue가 조회 시점(today)에 의존적이라 캐시하면 바로 낡은 값이 되기 때문.
 */

import { NextResponse } from "next/server";
import { buildProfiledSources } from "@/core/sourcePipeline";
import { OVERDUE_ALERT_CATEGORIES } from "@/config";
import { loadIncomeTransactionsAndRules, loadTerminatedSourceIds } from "@/lib/incomeData";
import { getCurrentUserId } from "@/lib/session";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const [{ transactions, userRules }, terminatedSourceIds] = await Promise.all([
    loadIncomeTransactionsAndRules(userId),
    loadTerminatedSourceIds(userId),
  ]);
  const sources = buildProfiledSources(transactions, userRules, new Date(), terminatedSourceIds);

  const result = sources.map((s) => ({
    ...s,
    showOverdueAlert: s.profile.isOverdue && OVERDUE_ALERT_CATEGORIES.includes(s.category),
  }));

  return NextResponse.json({ sources: result });
}
