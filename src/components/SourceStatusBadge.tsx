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
 * "종료 추정" 배지 (T10). alive=true인 소득원은 부모(page.tsx)가 아예 렌더링하지 않는다.
 * 클릭하면 종료 확정/보류를 묻는 팝업이 뜬다 — 판단 로직(isOverdue)은 core에 있고 테스트로 증명됨,
 * 여기선 팝업 열림 상태와 사용자 선택 2개("종료 확정"/"단순 지연")만 처리한다.
 * 종료 확정: POST /api/sources/terminate로 백엔드에 기록 후 서버 컴포넌트 갱신.
 * 단순 지연: DB 반영 없이 팝업만 닫는다(재알림 없음, 배지를 다시 누르면 또 뜬다).
 */
export function SourceStatusBadge({ sourceId, categoryLabel, periodDays, elapsedDays }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"종료 추정" | "종료" | "지연">("종료 추정");
  const [pending, setPending] = useState(false);

  // sourceId는 "가맹점명:category" 내부 그룹 키 — 화면엔 가맹점명만 보여준다.
  const displayName = sourceId.split(":")[0];

  async function handleTerminate() {
    setPending(true);
    await fetch("/api/sources/terminate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
      setStatus("종료");        
  router.refresh();
  setPending(false);
  setOpen(false);
}

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-butter/60 px-2.5 py-1 text-xs font-bold text-navy"
      >
        {status}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-butter p-5 text-navy shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm leading-relaxed">
              평소 {Math.round(periodDays)}일 주기로 입금되던{" "}
              <strong className="font-extrabold">{displayName}</strong>({categoryLabel})이(가){" "}
              {Math.round(elapsedDays)}일째 들어오지 않고 있어요. 종료되었나요?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleTerminate}
                disabled={pending}
                className="rounded-full bg-navy px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
              >
                종료 확정
              </button>
        
              <button
                type="button"
                onClick={() => {
                  setStatus("지연");
                setOpen(false);
                }}
                className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-navy"
              >
                단순 지연
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
