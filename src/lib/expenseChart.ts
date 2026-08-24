export type ExpenseChartStatus = "pending" | "done";

export type ExpenseChartEntry = {
  amount: number;
  categoryId: string;
  categoryLabel: string;
  categoryColor: string;
  isDone: boolean;
};

export type ExpenseChartSlice = {
  categoryId: string;
  label: string;
  color: string;
  amount: number;
  percentage: number;
};

export function buildExpenseChart(
  entries: ExpenseChartEntry[],
  selectedCategoryIds: ReadonlySet<string>,
  status: ExpenseChartStatus,
): { slices: ExpenseChartSlice[]; total: number } {
  const totals = new Map<string, Omit<ExpenseChartSlice, "percentage">>();
  const isDone = status === "done";

  for (const entry of entries) {
    if (entry.isDone !== isDone || !selectedCategoryIds.has(entry.categoryId)) continue;

    const current = totals.get(entry.categoryId);
    totals.set(entry.categoryId, {
      categoryId: entry.categoryId,
      label: entry.categoryLabel,
      color: entry.categoryColor,
      amount: (current?.amount ?? 0) + entry.amount,
    });
  }

  const total = [...totals.values()].reduce((sum, slice) => sum + slice.amount, 0);
  const slices = [...totals.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((slice) => ({
      ...slice,
      percentage: total === 0 ? 0 : (slice.amount / total) * 100,
    }));

  return { slices, total };
}
