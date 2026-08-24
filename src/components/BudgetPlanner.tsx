"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FIXED_EXPENSE_CATEGORY_LABEL,
  FIXED_EXPENSE_CATEGORY_ORDER,
  type ExpenseCategory,
  type FixedExpenseCategory,
} from "@/config";
import { formatWon, formatWonThousand } from "@/lib/format";

const CATEGORIES: ExpenseCategory[] = ["식비", "쇼핑", "문화/여가", "교육/자기계발", "생필품/경조사", "기타"];

function zeroFixedExpenses(): Record<FixedExpenseCategory, number> {
  return Object.fromEntries(FIXED_EXPENSE_CATEGORY_ORDER.map((c) => [c, 0])) as Record<FixedExpenseCategory, number>;
}

function sumFixedExpenses(byCategory: Record<FixedExpenseCategory, number>): number {
  return FIXED_EXPENSE_CATEGORY_ORDER.reduce((sum, c) => sum + byCategory[c], 0);
}

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

export type ConfirmedProgress = {
  baseIncome: number;
  saving: number;
  allocations: Record<ExpenseCategory, number>;
  spentByCategory: Record<ExpenseCategory, number>;
};

type Props = {
  targetMonth: string;
  confirmedProgress: ConfirmedProgress | null;
};

/**
 * 예산 화면 (T10). 슬라이더 상호작용이 있어 Client Component로 분리 —
 * 이미 만들어진 POST /api/budget/draft, /confirm을 그대로 fetch한다.
 * aiAllocations(원안)는 화면에서 절대 수정하지 않고, 사용자가 조정한 값만
 * 별도 state(userAllocations)로 들고 있다가 확정 시 보낸다(절대 규칙 5번).
 *
 * targetMonth는 항상 "이번 달"이다. confirmedProgress가 있으면(=이번 달 예산을 이미
 * 확정해뒀으면) 새로 초안을 짜지 않고 진행률 뷰를 바로 보여준다.
 */
export function BudgetPlanner({ targetMonth, confirmedProgress }: Props) {
  const router = useRouter();
  const [fixedExpensesByCategory, setFixedExpensesByCategory] =
    useState<Record<FixedExpenseCategory, number>>(zeroFixedExpenses());
  const [plan, setPlan] = useState<DraftResponse | null>(null);
  const [userAllocations, setUserAllocations] = useState<Record<ExpenseCategory, number> | null>(null);
  const [loading, setLoading] = useState(!confirmedProgress);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

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
    // 확정된 달이어도 고정지출 내역은 계속 보여줘야 하니(확정 후 화면 포함) 항상 불러온다.
    // 온보딩/마이페이지에서 저장한 카테고리별 고정지출을 기본값으로 불러온다 — 매번 직접 입력하지 않아도 되게.
    // 기존 수동 입력(FixedExpensesBreakdown, "적용" 버튼)은 그대로 둬서 override는 계속 가능하다.
    fetch("/api/preferences/fixed-expenses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Record<FixedExpenseCategory, number> | null) => {
        const byCategory = data ?? zeroFixedExpenses();
        setFixedExpensesByCategory(byCategory);
        if (!confirmedProgress) {
          fetchDraft(sumFixedExpenses(byCategory));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMonth, confirmedProgress]);

  async function applyFixedExpenses() {
    // 카테고리별로 upsert하는 게 계약이라(PATCH /api/preferences/fixed-expenses) 4건을 병렬로 저장한 뒤
    // 합계로 초안을 다시 계산한다 — 마이페이지에서 수정해도 같은 데이터를 보게 된다.
    await Promise.all(
      FIXED_EXPENSE_CATEGORY_ORDER.map((category) =>
        fetch("/api/preferences/fixed-expenses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, amount: fixedExpensesByCategory[category] }),
        }),
      ),
    );
    fetchDraft(sumFixedExpenses(fixedExpensesByCategory));
  }

  async function handleConfirm() {
    if (plan?.status !== "DRAFT" || !userAllocations) return;
    setConfirming(true);
    setConfirmError(null);
    const res = await fetch("/api/budget/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, allocations: userAllocations }),
    });
    setConfirming(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setConfirmError(data.error ?? "예산 확정에 실패했어요. 다시 시도해주세요");
      return;
    }
    setConfirmed(true);
    router.refresh();
  }

  if (confirmedProgress) {
    return <BudgetProgressView progress={confirmedProgress} fixedExpensesByCategory={fixedExpensesByCategory} />;
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
        <FixedExpensesBreakdown
          value={fixedExpensesByCategory}
          onChange={(category, amount) =>
            setFixedExpensesByCategory((prev) => ({ ...prev, [category]: amount }))
          }
          onApply={applyFixedExpenses}
        />
      </div>
    );
  }

  const total = userAllocations
    ? CATEGORIES.reduce((sum, c) => sum + (userAllocations[c] ?? 0), 0)
    : 0;
  const spendable = total; // 카테고리 배분 합계 = disposable - saving (budget.ts 보존 법칙)

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm">
      <FixedExpensesBreakdown
        value={fixedExpensesByCategory}
        onChange={(category, amount) =>
          setFixedExpensesByCategory((prev) => ({ ...prev, [category]: amount }))
        }
        onApply={applyFixedExpenses}
      />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-ice p-4">
          <p className="font-bold text-navy/80">가용 예산</p>
          <p className="font-black text-navy">{formatWonThousand(spendable)}</p>
          <p className="text-xs text-navy/40">= 예상수입 - 고정지출 - 저축 비용</p>
        </div>
        <div className="rounded-xl bg-ice p-4">
          <p className="font-bold text-navy/80">저축</p>
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
              max={Math.max((plan.aiAllocations[category] ?? 0) * 3, 50_000)}
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
      {confirmError && <p className="text-sm text-red-500">{confirmError}</p>}
    </div>
  );
}

function BudgetProgressView({
  progress,
  fixedExpensesByCategory,
}: {
  progress: ConfirmedProgress;
  fixedExpensesByCategory: Record<FixedExpenseCategory, number>;
}) {
  const spendable = CATEGORIES.reduce((sum, c) => sum + (progress.allocations[c] ?? 0), 0);

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm">
      <FixedExpensesBreakdown value={fixedExpensesByCategory} readOnly />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-ice p-4">
          <p className="font-bold text-navy/80">가용 예산</p>
          <p className="font-black text-navy">{formatWonThousand(spendable)}</p>
          <p className="text-xs text-navy/40">= 예상수입 - 고정지출 - 저축 비용</p>
        </div>
        <div className="rounded-xl bg-ice p-4">
          <p className="font-bold text-navy/80">저축 비용</p>
          <p className="font-black text-navy">{formatWon(progress.saving)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {CATEGORIES.map((category) => {
          const confirmedAmount = progress.allocations[category] ?? 0;
          const spent = progress.spentByCategory[category] ?? 0;
          const pct = confirmedAmount > 0 ? (spent / confirmedAmount) * 100 : 0;
          const over = pct > 100;
          return (
            <div key={category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-navy">
                  {category} · {formatWon(spent)}
                </span>
                <span className="text-navy/70">{formatWon(confirmedAmount)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-ice">
                <div
                  className={`h-2 rounded-full ${over ? "bg-red-400" : "bg-cobalt"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className={`mt-1 text-xs ${over ? "text-red-500" : "text-navy/50"}`}>{pct.toFixed(0)}% 사용</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FixedExpensesBreakdown({
  value,
  onChange,
  onApply,
  readOnly = false,
}: {
  value: Record<FixedExpenseCategory, number>;
  onChange?: (category: FixedExpenseCategory, amount: number) => void;
  onApply?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-bold text-navy/80">고정지출</p>
      {FIXED_EXPENSE_CATEGORY_ORDER.map((category) => (
        <div key={category} className="flex items-center justify-between gap-3">
          <label className="text-navy/70" htmlFor={`fixedExpense-${category}`}>
            {FIXED_EXPENSE_CATEGORY_LABEL[category]}
          </label>
          {readOnly ? (
            <span className="font-medium text-navy">{formatWon(value[category])}</span>
          ) : (
            <input
              id={`fixedExpense-${category}`}
              type="number"
              min={0}
              step={1_000}
              value={value[category]}
              onChange={(e) => onChange?.(category, Number(e.target.value))}
              className="w-32 rounded-xl bg-ice px-3 py-1.5 text-right text-navy"
            />
          )}
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 border-t border-navy/10 pt-2 font-medium text-navy">
        <span>합계</span>
        <span>{formatWon(sumFixedExpenses(value))}</span>
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onApply}
          className="self-start rounded-full bg-ice px-3 py-1.5 font-medium text-navy"
        >
          적용
        </button>
      )}
    </div>
  );
}
