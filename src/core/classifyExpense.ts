/**
 * 지출 거래를 예산 카테고리(식비/카페/쇼핑/교통/기타)로 분류한다.
 * classify.ts가 입금을 소득원으로 분류하듯, 이건 지출을 예산 카테고리로 분류해서
 * budget.ts가 쓸 "카테고리별 과거평균지출"을 만든다. DB 접근 없는 순수 함수.
 */

import { FALLBACK_EXPENSE_CATEGORY, MERCHANT_CATEGORY_MAP, type ExpenseCategory } from "@/config";
import { normalizeCounterparty } from "./classify";

export type ExpenseTransaction = {
  id: string;
  occurredAt: Date;
  amount: number; // 지출은 음수
  rawDesc: string;
  counterparty: string;
};

export type ClassifiedExpense = {
  txId: string;
  category: ExpenseCategory;
};

const NORMALIZED_MERCHANT_MAP: [string, ExpenseCategory][] = Object.entries(MERCHANT_CATEGORY_MAP).map(
  ([merchant, category]) => [normalizeCounterparty(merchant), category],
);

/** 정규화된 counterparty가 MERCHANT_CATEGORY_MAP의 가맹점명을 포함하면 그 카테고리로 본다. 매칭 안 되면 fallback. */
function matchMerchantCategory(counterparty: string): ExpenseCategory {
  const normalized = normalizeCounterparty(counterparty);
  for (const [merchant, category] of NORMALIZED_MERCHANT_MAP) {
    if (normalized.includes(merchant)) {
      return category;
    }
  }
  return FALLBACK_EXPENSE_CATEGORY;
}

/** 지출(amount<0) 거래만 분류한다. 입금(amount>=0)은 무시. */
export function classifyExpenseTransactions(transactions: ExpenseTransaction[]): ClassifiedExpense[] {
  return transactions
    .filter((tx) => tx.amount < 0)
    .map((tx) => ({ txId: tx.id, category: matchMerchantCategory(tx.counterparty) }));
}

/**
 * 카테고리별 "월평균" 지출액(양수, 원)을 계산한다. budget.ts의 categoryHistoricalSpend 입력을 만든다.
 * monthCount는 transactions가 걸쳐 있는 개월 수 — 호출자가 계산해서 넘긴다.
 */
export function averageMonthlySpendByCategory(
  transactions: ExpenseTransaction[],
  monthCount: number,
): Record<ExpenseCategory, number> {
  const classified = classifyExpenseTransactions(transactions);
  const byTxId = new Map(transactions.map((tx) => [tx.id, tx]));

  const totals: Record<ExpenseCategory, number> = { 식비: 0, 카페: 0, 쇼핑: 0, 교통: 0, 기타: 0 };
  for (const c of classified) {
    totals[c.category] += Math.abs(byTxId.get(c.txId)!.amount);
  }

  const result = {} as Record<ExpenseCategory, number>;
  for (const category of Object.keys(totals) as ExpenseCategory[]) {
    result[category] = totals[category] / monthCount;
  }
  return result;
}
