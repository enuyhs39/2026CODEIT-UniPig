import type { LedgerEntryType, PaletteColor } from "@/generated/prisma/enums";
import { PALETTE_BADGE_CLASSES } from "@/lib/categoryColors";
import { cn } from "@/lib/utils";

type BoardCategory = {
  id: string;
  label: string;
  color: PaletteColor;
};

type BoardEntry = {
  id: string;
  categoryId: string;
  description: string;
  amount: number;
  date: Date;
  isDone: boolean;
};

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function TransactionCategoryBoard({
  categories,
  entries,
  type,
}: {
  categories: BoardCategory[];
  entries: BoardEntry[];
  type: LedgerEntryType;
}) {
  return (
    <section id="transaction-category-board" aria-label="카테고리별 거래 보드" className="overflow-hidden rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-extrabold">카테고리 보드</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">카테고리별로 내역을 모아봤어요.</p>
        </div>
        <span className="text-[10.5px] font-semibold text-muted-foreground">{categories.length}개 카테고리</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-start gap-3">
          {categories.map((category) => {
            const categoryEntries = entries.filter((entry) => entry.categoryId === category.id);
            const total = categoryEntries.reduce((sum, entry) => sum + entry.amount, 0);

            return (
              <article
                key={category.id}
                className={cn("w-56 shrink-0 rounded-xl p-2.5", PALETTE_BADGE_CLASSES[category.color])}
              >
                <header className="mb-2 flex items-center justify-between gap-2 px-0.5">
                  <h3 className="truncate text-[12px] font-bold">{category.label}</h3>
                  <span className="shrink-0 text-[10px] font-semibold opacity-75">{formatWon(total)}</span>
                </header>

                <div className="flex flex-col gap-1.5">
                  {categoryEntries.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-card-border bg-card p-2.5 text-foreground shadow-sm">
                      <div className="flex items-start gap-1.5">
                        <span
                          className={cn(
                            "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white",
                            entry.isDone ? "bg-success" : type === "EXPENSE" ? "bg-danger" : "bg-accent",
                          )}
                        >
                          {entry.isDone ? "✓" : type === "EXPENSE" ? "−" : "+"}
                        </span>
                        <p className="line-clamp-2 text-[11.5px] font-semibold leading-4">{entry.description}</p>
                      </div>
                      <p className="mt-2 text-[10.5px] font-semibold tabular-nums">{formatWon(entry.amount)}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(entry.date)}</p>
                    </div>
                  ))}

                  {categoryEntries.length === 0 && (
                    <p className="rounded-lg border border-dashed border-current/20 bg-card/65 px-2.5 py-5 text-center text-[10.5px] font-medium opacity-70">
                      내역이 없어요
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
