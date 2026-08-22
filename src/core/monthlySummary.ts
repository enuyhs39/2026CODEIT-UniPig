/** DB 접근 없는 순수 함수 — 이번 달 거래 목록을 받아 수입/지출/남은 금액을 집계한다. */

export type MonthlySummary = {
  totalIncome: number;
  totalExpense: number;
  remaining: number;
};

export function calculateMonthlySummary(
  transactions: { amount: number }[],
): MonthlySummary {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.amount > 0) {
      totalIncome += tx.amount;
    } else {
      totalExpense += -tx.amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    remaining: totalIncome - totalExpense,
  };
}
