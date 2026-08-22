"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  sourceId: string;
  categoryLabel: string;
  periodDays: number;
  elapsedDays: number;
};

/**
 * 입금 지연 알림 카드 (T10). 판단 로직(isOverdue)은 core에 있고 테스트로 증명됨 —
 * 여기선 사용자 선택 2개("종료 확정"/"단순 지연")만 처리한다.
 * 종료 확정: POST /api/sources/terminate로 백엔드에 기록 후 서버 컴포넌트 갱신.
 * 단순 지연: DB 반영 없이 로컬에서만 카드 숨김(재알림 없음, 새로고침하면 다시 뜸).
 */
export function OverdueAlertCard({ sourceId, categoryLabel, periodDays, elapsedDays }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);

  if (dismissed) return null;

  async function handleTerminate() {
    setPending(true);
    await fetch("/api/sources/terminate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-butter bg-butter/60 p-4 text-navy">
      <p className="text-sm leading-relaxed">
        평소 {Math.round(periodDays)}일 주기로 입금되던 <strong>{sourceId}</strong>({categoryLabel})이(가){" "}
        {Math.round(elapsedDays)}일째 들어오지 않고 있어요. 종료되었나요?
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleTerminate}
          disabled={pending}
          className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          종료 확정
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md border border-navy/30 px-3 py-1.5 text-sm font-medium text-navy"
        >
          단순 지연
        </button>
      </div>
    </div>
  );
}
