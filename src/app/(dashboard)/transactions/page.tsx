import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PALETTE_BADGE_CLASSES } from "@/lib/categoryColors";
import { AddEntryToolbar } from "@/components/transactions/add-entry-toolbar";
import { TransactionDonutChart } from "@/components/transactions/transaction-donut-chart";
import { TransactionCategoryBoard } from "@/components/transactions/transaction-category-board";
import { deleteLedgerEntry, toggleLedgerEntryDone } from "./actions";
import type { LedgerEntryType } from "@/generated/prisma/enums";
import type { TransactionChartStatus } from "@/lib/transactionChart";

const TYPE_TABS = [
  { value: "expense", label: "지출" },
  { value: "income", label: "수입" },
  { value: "all", label: "전체" },
] as const;
type TypeTab = (typeof TYPE_TABS)[number]["value"];

const STATUS_LABEL = {
  EXPENSE: { pending: "지출예상", done: "지출완료" },
  INCOME: { pending: "수입예상", done: "수입완료" },
} as const;

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const userId = await requireUserId();
  const params = await searchParams;
  const sort = params.sort === "asc" ? "asc" : "desc";
  const fromRaw = typeof params.from === "string" ? params.from : "";
  const toRaw = typeof params.to === "string" ? params.to : "";
  const categoryRaw = typeof params.category === "string" ? params.category : "";
  const typeTab: TypeTab = params.type === "income" ? "income" : params.type === "all" ? "all" : "expense";
  const chartStatus: TransactionChartStatus | undefined =
    typeTab !== "all" && (params.chart === "pending" || params.chart === "done") ? params.chart : undefined;
  const categoryBoardOpen = typeTab !== "all" && params.board === "category";
  const typeFilter: LedgerEntryType | undefined =
    typeTab === "expense" ? "EXPENSE" : typeTab === "income" ? "INCOME" : undefined;

  const now = new Date();
  const monthParam = Number(params.month);
  const month = Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12 ? monthParam : now.getMonth() + 1;
  const year = now.getFullYear();

  const hasCustomRange = Boolean(fromRaw && toRaw);
  const rangeStart = hasCustomRange ? new Date(fromRaw) : new Date(Date.UTC(year, month - 1, 1));
  const rangeEnd = hasCustomRange
    ? new Date(new Date(toRaw).getTime() + 24 * 60 * 60 * 1000)
    : new Date(Date.UTC(year, month, 1));

  const categories = await prisma.ledgerCategory.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  const filterCategories = categories.filter((category) => !typeFilter || category.type === typeFilter);
  const selectedCategory = filterCategories.find((category) => category.id === categoryRaw);
  const selectedCategoryId = selectedCategory?.id ?? "";
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      userId,
      date: { gte: rangeStart, lt: rangeEnd },
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
    },
    orderBy: { date: sort },
    include: { category: true },
  });

  const typeLabel = typeTab === "expense" ? "지출" : typeTab === "income" ? "수입" : "지출/수입";
  const title = hasCustomRange ? `${fromRaw} ~ ${toRaw} ${typeLabel} 내역` : `${month}월 ${typeLabel} 내역`;
  const otherSort = sort === "asc" ? "desc" : "asc";
  const dateQuery = hasCustomRange ? `from=${fromRaw}&to=${toRaw}` : `month=${month}`;
  const baseQuery = `${dateQuery}${selectedCategoryId ? `&category=${selectedCategoryId}` : ""}`;
  const boardQuery = categoryBoardOpen ? "&board=category" : "";
  const sortQuery = `${baseQuery}&type=${typeTab}${chartStatus ? `&chart=${chartStatus}` : ""}${boardQuery}`;
  const chartEntryType: LedgerEntryType | undefined =
    typeTab === "expense" ? "EXPENSE" : typeTab === "income" ? "INCOME" : undefined;
  const chartCategories = chartEntryType
    ? categories.filter(
        (category) => category.type === chartEntryType && (!selectedCategoryId || category.id === selectedCategoryId),
      )
    : [];
  const chartEntries = entries
    .filter((entry) => entry.type === chartEntryType)
    .map((entry) => ({
      amount: entry.amount,
      categoryId: entry.categoryId,
      categoryLabel: entry.category.label,
      categoryColor: entry.category.color,
      isDone: entry.isDone,
    }));
  const chartRangeLabel = hasCustomRange ? `${fromRaw} ~ ${toRaw}` : `${year}년 ${month}월`;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-gold-soft px-5 py-4 shadow-sm">
        <h1 className="text-[19px] font-extrabold text-foreground">{title}</h1>
      </div>

      <nav aria-label="거래 내역 보기" className="flex flex-col items-start gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-card-border bg-card p-1 shadow-sm">
          {TYPE_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`?${dateQuery}&sort=${sort}&type=${tab.value}${
                selectedCategory &&
                (tab.value === "all" ||
                  selectedCategory.type === (tab.value === "expense" ? "EXPENSE" : "INCOME"))
                  ? `&category=${selectedCategory.id}`
                  : ""
              }${categoryBoardOpen && tab.value !== "all" ? "&board=category" : ""}`}
              aria-current={typeTab === tab.value ? "page" : undefined}
              className={cn(
                "rounded-lg px-4 py-2 text-[12.5px] font-semibold transition-colors",
                typeTab === tab.value
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted-foreground hover:bg-accent-soft hover:text-accent",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {typeTab !== "all" && (
          <div className="flex w-full flex-wrap items-center gap-3 pl-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground">{typeLabel} 상태</span>
              <div className="inline-flex items-center gap-0.5 rounded-lg bg-accent-soft p-1">
                {([
                  { value: "pending", label: "예정" },
                  { value: "done", label: "완료" },
                ] as const).map((item) => (
                  <Link
                    key={item.value}
                    href={`?${baseQuery}&sort=${sort}&type=${typeTab}${
                      chartStatus === item.value ? "" : `&chart=${item.value}`
                    }${boardQuery}`}
                    aria-expanded={chartStatus === item.value}
                    aria-controls="transaction-status-chart"
                    className={cn(
                      "rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                      chartStatus === item.value
                        ? "bg-card text-accent shadow-sm"
                        : "text-muted-foreground hover:text-accent",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href={`?${baseQuery}&sort=${sort}&type=${typeTab}${chartStatus ? `&chart=${chartStatus}` : ""}${
                categoryBoardOpen ? "" : "&board=category"
              }`}
              aria-expanded={categoryBoardOpen}
              aria-controls="transaction-category-board"
              className={cn(
                "ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                categoryBoardOpen
                  ? "border-accent bg-accent text-white shadow-sm"
                  : "border-card-border bg-card text-muted-foreground hover:border-accent hover:text-accent",
              )}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="7" height="16" rx="1.5" />
                <rect x="14" y="4" width="7" height="10" rx="1.5" />
              </svg>
              카테고리
            </Link>
          </div>
        )}
      </nav>

      <AddEntryToolbar
        sortLabel={`날짜 ${sort === "desc" ? "최신순 ↓" : "오래된순 ↑"}`}
        sortHref={`?${sortQuery}&sort=${otherSort}`}
        fromValue={fromRaw || toDateInputValue(rangeStart)}
        toValue={toRaw}
        hasCustomRange={hasCustomRange}
        resetHref={`?month=${month}&type=${typeTab}${chartStatus ? `&chart=${chartStatus}` : ""}${boardQuery}`}
        categories={categories}
        filterCategories={filterCategories}
        selectedCategoryId={selectedCategoryId}
        defaultDate={toDateInputValue(now)}
        defaultType={typeTab === "income" ? "INCOME" : "EXPENSE"}
        typeTabValue={typeTab}
        chartStatus={chartStatus}
        sortValue={sort}
        monthValue={month}
        categoryBoardOpen={categoryBoardOpen}
      />

      {typeTab !== "all" && chartStatus && chartCategories.length > 0 && (
        <div id="transaction-status-chart">
          <TransactionDonutChart
            categories={chartCategories.map((category) => ({
              id: category.id,
              label: category.label,
              color: category.color,
            }))}
            entries={chartEntries}
            rangeLabel={chartRangeLabel}
            status={chartStatus}
            type={typeTab}
          />
        </div>
      )}

      {typeTab !== "all" && categoryBoardOpen && (
        <TransactionCategoryBoard
          categories={filterCategories.map((category) => ({
            id: category.id,
            label: category.label,
            color: category.color,
          }))}
          entries={entries.map((entry) => ({
            id: entry.id,
            categoryId: entry.categoryId,
            description: entry.description,
            amount: entry.amount,
            date: entry.date,
            isDone: entry.isDone,
          }))}
          type={typeFilter!}
        />
      )}

      {categories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-card-border p-4 text-center text-[12.5px] text-muted-foreground">
          아직 구분이 없어요. 마이페이지에서 구분을 먼저 만들어주세요.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
        <table className="w-full min-w-[420px] table-fixed border-collapse text-[11.5px]">
          <colgroup>
            <col className="w-10" />
            <col className="w-20" />
            <col className="w-16" />
            <col />
            <col className="w-20" />
            <col className="w-9" />
          </colgroup>
          <thead>
            <tr className="border-b border-card-border text-left text-[10.5px] font-bold text-muted-foreground">
              <th className="px-1.5 py-2 text-center">완료</th>
              <th className="px-1.5 py-2">날짜</th>
              <th className="px-1.5 py-2">구분</th>
              <th className="px-1.5 py-2">내역</th>
              <th className="px-1.5 py-2 text-right">금액</th>
              <th className="px-1.5 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const status = STATUS_LABEL[entry.type][entry.isDone ? "done" : "pending"];
              return (
                <tr key={entry.id} className="border-b border-card-border last:border-b-0">
                  <td className="px-1.5 py-2 text-center">
                    <form action={toggleLedgerEntryDone}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="isDone" value={String(entry.isDone)} />
                      <button
                        type="submit"
                        title={status}
                        className={cn(
                          "flex h-[18px] w-[18px] items-center justify-center rounded-md border transition-colors",
                          entry.isDone
                            ? "border-accent bg-accent"
                            : "border-card-border bg-background",
                        )}
                      >
                        {entry.isDone && (
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="white" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </form>
                  </td>
                  <td className="whitespace-nowrap px-1.5 py-2 tabular-nums text-[11px] text-muted-foreground">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-1.5 py-2">
                    <span
                      className={cn(
                        "inline-block truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        PALETTE_BADGE_CLASSES[entry.category.color],
                      )}
                    >
                      {entry.category.label}
                    </span>
                  </td>
                  <td className="px-1.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full text-[8px] font-bold leading-none text-white",
                          entry.type === "EXPENSE" ? "bg-danger" : "bg-success",
                        )}
                      >
                        {entry.type === "EXPENSE" ? "−" : "+"}
                      </span>
                      <span className="truncate">{entry.description}</span>
                    </div>
                  </td>
                  <td className="truncate px-1.5 py-2 text-right tabular-nums font-semibold">
                    {formatWon(entry.amount)}
                  </td>
                  <td className="whitespace-nowrap px-1.5 py-2 text-right">
                    <form action={deleteLedgerEntry}>
                      <input type="hidden" name="id" value={entry.id} />
                      <button
                        type="submit"
                        className="text-[10px] font-semibold text-muted-foreground transition-opacity hover:opacity-70"
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                  이 기간엔 기록이 없어요
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
