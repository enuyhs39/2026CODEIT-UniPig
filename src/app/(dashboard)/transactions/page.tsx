import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PALETTE_BADGE_CLASSES } from "@/lib/categoryColors";
import { AddEntryToolbar } from "@/components/transactions/add-entry-toolbar";
import { deleteLedgerEntry, toggleLedgerEntryDone } from "./actions";
import type { LedgerEntryType } from "@/generated/prisma/enums";

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
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
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
  const typeTab: TypeTab = params.type === "income" ? "income" : params.type === "all" ? "all" : "expense";
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

  const [entries, categories] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { userId, date: { gte: rangeStart, lt: rangeEnd }, ...(typeFilter ? { type: typeFilter } : {}) },
      orderBy: { date: sort },
      include: { category: true },
    }),
    prisma.ledgerCategory.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const typeLabel = typeTab === "expense" ? "지출" : typeTab === "income" ? "수입" : "지출/수입";
  const title = hasCustomRange ? `${fromRaw} ~ ${toRaw} ${typeLabel} 내역` : `${month}월 ${typeLabel} 내역`;
  const otherSort = sort === "asc" ? "desc" : "asc";
  const baseQuery = hasCustomRange ? `from=${fromRaw}&to=${toRaw}` : `month=${month}`;
  const sortQuery = `${baseQuery}&type=${typeTab}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-accent-soft px-5 py-4">
        <h1 className="text-[19px] font-extrabold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        {TYPE_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`?${baseQuery}&sort=${sort}&type=${tab.value}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              typeTab === tab.value
                ? "bg-accent text-white"
                : "border border-card-border text-muted-foreground hover:border-accent hover:text-accent",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <AddEntryToolbar
        sortLabel={`날짜 ${sort === "desc" ? "최신순 ↓" : "오래된순 ↑"}`}
        sortHref={`?${sortQuery}&sort=${otherSort}`}
        fromValue={fromRaw || toDateInputValue(rangeStart)}
        toValue={toRaw}
        hasCustomRange={hasCustomRange}
        resetHref={`?month=${month}&type=${typeTab}`}
        categories={categories}
        defaultDate={toDateInputValue(now)}
        defaultType={typeTab === "income" ? "INCOME" : "EXPENSE"}
        typeTabValue={typeTab}
      />

      {categories.length === 0 && (
        <p className="rounded-2xl border border-dashed border-card-border p-4 text-center text-[12.5px] text-muted-foreground">
          아직 구분이 없어요. 마이페이지에서 구분을 먼저 만들어주세요.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-card-border bg-card">
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
                  <td className="whitespace-nowrap px-1.5 py-2 font-mono text-[11px] text-muted-foreground">
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
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none text-white",
                          entry.type === "EXPENSE" ? "bg-danger" : "bg-success",
                        )}
                      >
                        {entry.type === "EXPENSE" ? "−" : "+"}
                      </span>
                      <span className="truncate">{entry.description}</span>
                    </div>
                  </td>
                  <td className="truncate px-1.5 py-2 text-right font-mono font-semibold">
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
