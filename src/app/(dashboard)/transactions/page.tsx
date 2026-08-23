import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/config";
import { cn } from "@/lib/utils";
import { PALETTE_BADGE_CLASSES } from "@/lib/categoryColors";
import { EntryTypeCategoryFields } from "@/components/transactions/entry-type-category-fields";
import { createLedgerEntry, deleteLedgerEntry, toggleLedgerEntryDone } from "./actions";

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
  const params = await searchParams;
  const sort = params.sort === "asc" ? "asc" : "desc";
  const fromRaw = typeof params.from === "string" ? params.from : "";
  const toRaw = typeof params.to === "string" ? params.to : "";

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
      where: { userId: DEMO_USER_ID, date: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { date: sort },
      include: { category: true },
    }),
    prisma.ledgerCategory.findMany({
      where: { userId: DEMO_USER_ID },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const title = hasCustomRange ? `${fromRaw} ~ ${toRaw}` : `${month}월 지출/수입 내역`;
  const otherSort = sort === "asc" ? "desc" : "asc";
  const sortQuery = hasCustomRange ? `from=${fromRaw}&to=${toRaw}` : `month=${month}`;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[17px] font-bold">{title}</h1>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`?${sortQuery}&sort=${otherSort}`}
          className="rounded-lg border border-card-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          날짜 {sort === "desc" ? "최신순 ↓" : "오래된순 ↑"}
        </a>

        <form method="GET" className="flex items-center gap-1.5">
          <input
            type="date"
            name="from"
            defaultValue={fromRaw || toDateInputValue(rangeStart)}
            className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
          />
          <span className="text-[12px] text-muted-foreground">~</span>
          <input
            type="date"
            name="to"
            defaultValue={toRaw}
            className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            기간 적용
          </button>
          {hasCustomRange && (
            <a
              href={`?month=${month}`}
              className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
            >
              초기화
            </a>
          )}
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-card-border bg-card">
        <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-card-border text-left text-[11px] font-bold text-muted-foreground">
              <th className="px-3 py-2.5">날짜</th>
              <th className="px-3 py-2.5">구분</th>
              <th className="px-3 py-2.5">내역</th>
              <th className="px-3 py-2.5 text-right">금액</th>
              <th className="px-3 py-2.5 text-center">예정</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const status = STATUS_LABEL[entry.type][entry.isDone ? "done" : "pending"];
              return (
                <tr key={entry.id} className="border-b border-card-border last:border-b-0">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-muted-foreground">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[11px] font-semibold",
                        PALETTE_BADGE_CLASSES[entry.category.color],
                      )}
                    >
                      {entry.category.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{entry.description}</td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold",
                      entry.type === "EXPENSE" ? "text-danger" : "text-success",
                    )}
                  >
                    {entry.type === "EXPENSE" ? "-" : "+"}
                    {formatWon(entry.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <form action={toggleLedgerEntryDone}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="isDone" value={String(entry.isDone)} />
                      <button
                        type="submit"
                        title={status}
                        className={cn(
                          "h-5 w-5 rounded-md border transition-colors",
                          entry.isDone
                            ? "border-accent bg-accent"
                            : "border-card-border bg-background",
                        )}
                      />
                    </form>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <form action={deleteLedgerEntry}>
                      <input type="hidden" name="id" value={entry.id} />
                      <button
                        type="submit"
                        className="text-[11px] font-semibold text-muted-foreground transition-opacity hover:opacity-70"
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

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-card-border p-4 text-center text-[12.5px] text-muted-foreground">
          아직 구분이 없어요. 마이페이지에서 구분을 먼저 만들어주세요.
        </p>
      ) : (
      <form
        action={createLedgerEntry}
        className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-card-border p-4"
      >
        <p className="text-[12.5px] font-bold text-muted-foreground">새 항목 추가</p>
        <div className="flex flex-wrap gap-2">
          <EntryTypeCategoryFields categories={categories} />
          <input
            type="date"
            name="date"
            required
            defaultValue={toDateInputValue(now)}
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            name="description"
            required
            placeholder="내역"
            className="flex-1 rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <input
            type="number"
            name="amount"
            required
            min={1}
            placeholder="금액"
            className="w-32 rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          className="self-start rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          추가
        </button>
      </form>
      )}
    </div>
  );
}
