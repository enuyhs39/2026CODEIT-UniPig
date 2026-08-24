"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FIXED_EXPENSE_CATEGORY_LABEL,
  FIXED_EXPENSE_CATEGORY_ORDER,
  type FixedExpenseCategory,
} from "@/config";

const STEP_TITLES = ["고정지출", "목표 저축 비율", "거래내역 업로드"];

/**
 * 예산 화면 첫 진입 게이트(§3b). 3단계를 다 채우기 전에는 여기서 못 벗어난다 —
 * CSV가 필수라서 중간에 부분적으로 저장하지 않고, 마지막에 한 번에 POST /api/onboarding으로 제출한다.
 */
export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fixedExpenses, setFixedExpenses] = useState<Record<FixedExpenseCategory, number>>({
    TRANSPORT: 0,
    SUBSCRIPTION: 0,
    UTILITIES: 0,
    OTHER: 0,
  });
  const [savingRatePercent, setSavingRatePercent] = useState(10);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setCsvText(null);
      setCsvFileName(null);
      return;
    }
    setCsvText(await file.text());
    setCsvFileName(file.name);
  }

  async function handleSubmit() {
    if (!csvText) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fixedExpenses,
        savingRate: savingRatePercent / 100,
        csv: csvText,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "제출 중 문제가 발생했어요. 다시 시도해주세요");
      setSubmitting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-navy/50">
          {step + 1} / {STEP_TITLES.length}
        </p>
        <h2 className="text-lg font-black text-navy">{STEP_TITLES[step]}</h2>
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-navy/60">매달 고정으로 나가는 지출을 카테고리별로 입력해주세요.</p>
          {FIXED_EXPENSE_CATEGORY_ORDER.map((category) => (
            <div key={category} className="flex items-center justify-between gap-3">
              <label htmlFor={category} className="text-sm font-medium text-navy">
                {FIXED_EXPENSE_CATEGORY_LABEL[category]}
              </label>
              <input
                id={category}
                type="number"
                min={0}
                step={1_000}
                value={fixedExpenses[category]}
                onChange={(e) =>
                  setFixedExpenses((prev) => ({ ...prev, [category]: Number(e.target.value) }))
                }
                className="w-32 rounded-xl bg-ice px-3 py-2 text-right text-navy"
              />
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-navy/60">쓸 수 있는 돈 중 몇 %를 저축하고 싶으신가요?</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={savingRatePercent}
              onChange={(e) => setSavingRatePercent(Number(e.target.value))}
              className="w-full accent-cobalt"
            />
            <span className="w-14 text-right font-black text-navy">{savingRatePercent}%</span>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-navy/60">
            지난 12개월간의 거래내역 CSV 파일을 업로드해주세요. <strong>필수</strong>예요 — 이 데이터로 수입을
            예측하고 예산을 짜요.
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-cobalt/40 bg-ice px-4 py-8 text-center">
            <span className="text-sm font-medium text-navy">
              {csvFileName ?? "CSV 파일을 선택하세요"}
            </span>
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          className="rounded-full bg-ice px-5 py-2.5 text-sm font-bold text-navy disabled:opacity-40"
        >
          이전
        </button>

        {step < STEP_TITLES.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="rounded-full bg-navy px-6 py-2.5 text-sm font-extrabold text-white"
          >
            다음
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!csvText || submitting}
            className="rounded-full bg-navy px-6 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {submitting ? "제출하는 중..." : "온보딩 완료"}
          </button>
        )}
      </div>
    </div>
  );
}
