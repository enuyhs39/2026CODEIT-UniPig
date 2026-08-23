"use client";

import { useEffect, useState } from "react";
import type { ExpenseCategory } from "@/config";
import { formatWon, formatWonThousand } from "@/lib/format";

const CATEGORIES: ExpenseCategory[] = ["식비", "카페", "쇼핑", "교통", "기타"];

type DraftPlan = {
  id: string;
  targetMonth: string;
  baseIncome: number;
  aiAllocations: Record<ExpenseCategory, number>;
  allocations: Record<ExpenseCategory, number>;
  saving: number;
  status: "DRAFT" | "CONFIRMED";
};

type DeficitResult = {
  status: "DEFICIT_ALERT";
  baseIncome: number;
  fixedExpenses: number;
  shortfall: number;
};

type DraftResponse = DraftPlan | DeficitResult;

type Props = {
  targetMonth: string;
};

/**
 * 예산 화면 (T10). 슬라이더 상호작용이 있어 Client Component로 분리 —
 * 이미 만들어진 POST /api/budget/draft, /confirm을 그대로 fetch한다.
 * aiAllocations(원안)는 화면에서 절대 수정하지 않고, 사용자가 조정한 값만
 * 별도 state(userAllocations)로 들고 있다가 확정 시 보낸다(절대 규칙 5번).
 */
export function BudgetPlanner({ targetMonth }: Props) {
  const [fixedExpenses, setFixedExpenses] = useState(0);
  const [plan, setPlan] = useState<DraftResponse | null>(null);
  const [userAllocations, setUserAllocations] = useState<Record<ExpenseCategory, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function fetchDraft(fixed: number) {
    setLoading(true);
    setConfirmed(false);
    const res = await fetch("/api/budget/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetMonth, fixedExpenses: fixed }),
    });
    const data: DraftResponse = await res.json();
    setPlan(data);
    if (data.status === "DRAFT") {
      setUserAllocations(data.aiAllocations);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDraft(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMonth]);

  async function handleConfirm() {
    if (plan?.status !== "DRAFT" || !userAllocations) return;
    setConfirming(true);
    await fetch("/api/budget/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, allocations: userAllocations }),
    });
    setConfirming(false);
    setConfirmed(true);
  }

  if (loading) {
    return <p className="text-sm text-navy/60">예산안을 계산하는 중이에요...</p>;
  }

  if (!plan) {
    return null;
  }

  if (plan.status === "DEFICIT_ALERT") {
    return (
      <div className="rounded-2xl bg-butter/60 p-5 text-navy shadow-sm">
        <p className="text-sm leading-relaxed">
          예상 수입({formatWon(plan.baseIncome)})이 고정지출({formatWon(plan.fixedExpenses)})보다{" "}
          <strong className="font-extrabold">{formatWon(plan.shortfall)}</strong> 부족해요. 고정지출을 줄이거나 수입원을 늘려야 해요.
        </p>
        <FixedExpensesInput value={fixedExpenses} onChange={setFixedExpenses} onApply={() => fetchDraft(fixedExpenses)} />
      </div>
    );
  }

  const total = userAllocations
    ? CATEGORIES.reduce((sum, c) => sum + (userAllocations[c] ?? 0), 0)
    : 0;
  const spendable = total; // 카테고리 배분 합계 = disposable - saving (budget.ts 보존 법칙)

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm">
      <FixedExpensesInput value={fixedExpenses} onChange={setFixedExpenses} onApply={() => fetchDraft(fixedExpenses)} />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-ice p-4">
          <p className="text-navy/50">다음 달 기준선</p>
          <p className="font-black text-navy">{formatWonThousand(plan.baseIncome)}</p>
        </div>
        <div className="rounded-xl bg-ice p-4">
          <p className="text-navy/50">저축</p>
          <p className="font-black text-navy">{formatWon(plan.saving)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {CATEGORIES.map((category) => (
          <div key={category}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-navy">{category}</span>
              <span className="text-navy/70">{formatWon(userAllocations?.[category] ?? 0)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(plan.aiAllocations[category] * 3, 50_000)}
              step={1_000}
              value={userAllocations?.[category] ?? 0}
              onChange={(e) =>
                setUserAllocations((prev) => (prev ? { ...prev, [category]: Number(e.target.value) } : prev))
              }
              className="w-full accent-cobalt"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-navy/50">
        카테고리 배분 합계 {formatWon(spendable)} (AI 원안 기준 가용 예산과 다를 수 있어요 — 자유롭게 조정해보세요)
      </p>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={confirming}
        className="self-start rounded-full bg-navy px-6 py-3 text-sm font-extrabold text-white disabled:opacity-50"
      >
        {confirming ? "확정하는 중..." : "예산 확정"}
      </button>

      {confirmed && <p className="text-sm text-cobalt">예산이 확정됐어요. 다음 예산 수립 때 이 조정이 조금씩 반영돼요.</p>}
    </div>
  );
}

function FixedExpensesInput({
  value,
  onChange,
  onApply,
}: {
  value: number;
  onChange: (v: number) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-navy/70" htmlFor="fixedExpenses">
        고정지출(월세·통신비 등)
      </label>
      <input
        id="fixedExpenses"
        type="number"
        min={0}
        step={1_000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 rounded-xl bg-ice px-3 py-1.5 text-navy"
      />
      <button type="button" onClick={onApply} className="rounded-full bg-ice px-3 py-1.5 font-medium text-navy">
        적용
      </button>
    </div>
  );
}
