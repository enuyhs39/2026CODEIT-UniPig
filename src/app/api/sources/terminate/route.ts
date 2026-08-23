/**
 * 소득원 "종료 확정" 기록. POST /api/sources/terminate
 * { sourceId: string }
 * 계산으로는 알 수 없는 사용자의 판단이라 source_terminations에 저장한다(T10 지연 알림 카드).
 * 존재하지 않는 sourceId를 보내도 그냥 기록만 한다 — 검증은 GET /api/sources가 실제로 반환한
 * sourceId만 프론트에서 보내는 것으로 보장한다(서버는 별도 존재 확인 없음).
 */

import { NextResponse } from "next/server";
import { terminateSource } from "@/lib/incomeData";
import { getCurrentUserId } from "@/lib/session";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sourceId: string | undefined = body.sourceId;

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId가 필요합니다" }, { status: 400 });
  }

  await terminateSource(userId, sourceId);

  return NextResponse.json({ sourceId, terminated: true });
}
