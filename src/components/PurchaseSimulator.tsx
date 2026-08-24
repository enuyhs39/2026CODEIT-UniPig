"use client";

import { useState } from "react";
import Link from "next/link";
import type { ExpenseCategory } from "@/config";
import { simulatePurchase, type SimulateBudgetProgress } from "@/core/simulatePurchase";
import { formatWon } from "@/lib/format";

const CATEGORIES: ExpenseCategory[] = ["식비", "쇼핑", "문화/여가", "교육/자기계발", "생필품/경조사", "기타"];

export function PurchaseSimulator({ progress }: { progress: SimulateBudgetProgress }) {
  const [category, setCategory] = useState<ExpenseCategory>("식비");
  const [amountInput, setAmountInput] = useState("");
  const amount = Number(amountInput);
  const result = amount > 0 ? simulatePurchase(progress, category, amount) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[17px] font-bold">구매 시뮬레이션</h1>
        <Link
          href="/budget"
          className="rounded-full border border-cobalt/25 bg-white px-4 py-2 text-[12.5px] font-semibold text-cobalt shadow-sm transition hover:bg-cobalt/5"
        >
          예산 조정
        </Link>
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        사려는 물건의 카테고리와 금액을 입력하면, 이번 달 확정 예산 안에서 살 수 있는지 바로 보여줘요.
      </p>

      <div className="rounded-xl border border-cobalt/15 bg-cobalt/5 px-4 py-3 text-[12.5px] text-muted-foreground">
        이 시뮬레이션은 <strong className="font-semibold text-foreground">AI피그에서 확정한 이번 달 카테고리별 예산</strong>을
        기준으로 계산해요.
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder="구매 금액"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
        </div>

        {result && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-background p-3.5 text-[13px]">
            <p className="text-muted-foreground">
              {category} 예산 {formatWon(result.budget)} 중 {formatWon(result.spentBefore)} 사용, 지금은{" "}
              {formatWon(result.remainingBefore)} 남았어요.
            </p>
            {result.overBudget ? (
              <p className="font-bold text-danger">
                이 구매를 하면 {category} 예산을 {formatWon(result.overBy)} 초과해요.
              </p>
            ) : (
              <p className="font-bold text-success">이 구매를 해도 {formatWon(result.remainingAfter)} 남아요.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
