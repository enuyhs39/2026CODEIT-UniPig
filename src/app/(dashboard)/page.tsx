import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { cn } from "@/lib/utils";
import { EXPENSE_GROUP_LABEL } from "@/lib/aiCategoryGroups";
import { formatWon } from "@/lib/format";
import type { ExpenseCategory as AiExpenseGroup } from "@/generated/prisma/enums";

const DEFAULT_NICKNAME = "피그";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const GROUP_ORDER: AiExpenseGroup[] = ["FOOD", "CAFE", "SHOPPING", "TRANSPORT", "OTHER"];

/** 지출 구성 바/범례 색상 — 마이페이지 배지와 같은 톤 팔레트(tag-*) 재사용. */
const GROUP_COLOR_CLASS: Record<AiExpenseGroup, string> = {
  FOOD: "bg-tag-red-text",
  CAFE: "bg-tag-brown-text",
  SHOPPING: "bg-tag-yellow-text",
  TRANSPORT: "bg-tag-blue-text",
  OTHER: "bg-tag-gray-text",
};

type MonthTotal = { income: number; expense: number };

function SummaryStat({
  label,
  value,
  tone,
  signed,
}: {
  label: string;
  value: number;
  tone: "success" | "danger";
  signed?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card px-3 py-3">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-[13.5px] font-extrabold", tone === "success" ? "text-success" : "text-danger")}>
        {signed ? (value >= 0 ? "+" : "-") : ""}
        {formatWon(Math.abs(value))}
      </p>
    </div>
  );
}

export default async function HomePage() {
  const userId = await requireUserId();
  const preference = await prisma.userPreference.findUnique({ where: { userId } });
  const nickname = preference?.nickname || DEFAULT_NICKNAME;

  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const yearEntries = await prisma.ledgerEntry.findMany({
    where: { userId, date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    include: { category: true },
  });

  const monthlyTotals = new Map<number, MonthTotal>();
  const categoryTotals = new Map<AiExpenseGroup, number>();

  for (const entry of yearEntries) {
    const month = entry.date.getMonth() + 1;
    const bucket = monthlyTotals.get(month) ?? { income: 0, expense: 0 };
    if (entry.type === "INCOME") bucket.income += entry.amount;
    else bucket.expense += entry.amount;
    monthlyTotals.set(month, bucket);

    if (entry.type === "EXPENSE" && month === currentMonth && entry.category.expenseGroup) {
      categoryTotals.set(
        entry.category.expenseGroup,
        (categoryTotals.get(entry.category.expenseGroup) ?? 0) + entry.amount,
      );
    }
  }

  const thisMonth = monthlyTotals.get(currentMonth) ?? { income: 0, expense: 0 };
  const net = thisMonth.income - thisMonth.expense;

  const categoryBreakdown = GROUP_ORDER.map((group) => ({ group, amount: categoryTotals.get(group) ?? 0 })).filter(
    (c) => c.amount > 0,
  );
  const categoryTotal = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐷</span>
          <h1 className="text-[17px] font-bold">유니피그({nickname})</h1>
        </div>
        <button
          type="button"
          className="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          새로 만들기
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <SummaryStat label={`${currentMonth}월 수입`} value={thisMonth.income} tone="success" />
        <SummaryStat label={`${currentMonth}월 지출`} value={thisMonth.expense} tone="danger" />
        <SummaryStat label="순잔액" value={net} tone={net >= 0 ? "success" : "danger"} signed />
      </div>

      {categoryBreakdown.length > 0 && (
        <div className="rounded-2xl border border-card-border bg-card p-4">
          <p className="mb-2.5 text-[12px] font-bold text-muted-foreground">{currentMonth}월 지출 구성</p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-track">
            {categoryBreakdown.map((c) => (
              <div
                key={c.group}
                className={GROUP_COLOR_CLASS[c.group]}
                style={{ width: `${(c.amount / categoryTotal) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5">
            {categoryBreakdown.map((c) => (
              <span key={c.group} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className={cn("h-1.5 w-1.5 rounded-full", GROUP_COLOR_CLASS[c.group])} />
                {EXPENSE_GROUP_LABEL[c.group]} {Math.round((c.amount / categoryTotal) * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
        <div className="border-b border-card-border px-4 py-2.5 text-[12px] font-semibold text-muted-foreground">
          {year}년
        </div>
        <ul>
          {MONTHS.map((month) => {
            const isCurrent = month === currentMonth;
            const totals = monthlyTotals.get(month);
            return (
              <li key={month} className="border-b border-card-border last:border-b-0">
                <Link
                  href={`/transactions?month=${month}`}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] transition-colors hover:bg-accent-soft"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", isCurrent ? "bg-danger" : "bg-track")} />
                  <span className={cn("w-7 shrink-0", isCurrent ? "font-bold text-danger" : "font-medium text-foreground")}>
                    {month}월
                  </span>
                  {isCurrent && (
                    <span className="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-danger">
                      이번 달
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-2 truncate font-mono text-[11px]">
                    {totals ? (
                      <>
                        {totals.income > 0 && <span className="text-success">+{formatWon(totals.income)}</span>}
                        {totals.expense > 0 && <span className="text-danger">-{formatWon(totals.expense)}</span>}
                      </>
                    ) : (
                      <span className="text-muted-foreground">기록 없음</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
