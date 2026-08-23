import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/config";
import { cn } from "@/lib/utils";
import { PALETTE_BADGE_CLASSES } from "@/lib/categoryColors";
import {
  PIGGYBANK_CATEGORIES,
  PIGGYBANK_CATEGORY_COLOR,
  PIGGYBANK_CATEGORY_LABEL,
  PIGGYBANK_STATUSES,
  PIGGYBANK_STATUS_LABEL,
} from "@/lib/piggyBankCategories";
import { createPiggyBankItem, deletePiggyBankItem, updatePiggyBankItem } from "./actions";

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function PiggyBankPage() {
  const items = await prisma.piggyBankItem.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { targetDate: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[17px] font-bold">저금통</h1>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const pct =
            item.targetAmount > 0
              ? Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100))
              : 0;

          return (
            <form
              key={item.id}
              action={updatePiggyBankItem}
              className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4"
            >
              <input type="hidden" name="id" value={item.id} />

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="title"
                  defaultValue={item.title}
                  className="min-w-0 flex-1 rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-sm font-bold outline-none focus:border-accent"
                />
              </div>

              <select
                name="category"
                defaultValue={item.category}
                className={cn(
                  "w-fit rounded-full border-none px-2.5 py-1 text-[11px] font-semibold outline-none",
                  PALETTE_BADGE_CLASSES[PIGGYBANK_CATEGORY_COLOR[item.category]],
                )}
              >
                {PIGGYBANK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {PIGGYBANK_CATEGORY_LABEL[category]}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <input
                  type="date"
                  name="startDate"
                  defaultValue={toDateInputValue(item.startDate)}
                  className="min-w-0 flex-1 rounded-lg border border-card-border bg-background px-2 py-1.5 text-[11.5px] outline-none focus:border-accent"
                />
                <span>→</span>
                <input
                  type="date"
                  name="targetDate"
                  defaultValue={toDateInputValue(item.targetDate)}
                  className="min-w-0 flex-1 rounded-lg border border-card-border bg-background px-2 py-1.5 text-[11.5px] outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-2 font-mono text-[12.5px]">
                <span className="text-muted-foreground">목표</span>
                <input
                  type="number"
                  name="targetAmount"
                  min={1}
                  defaultValue={item.targetAmount}
                  className="w-full min-w-0 rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-track">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-[12px] font-bold text-accent">{pct}%</span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[12.5px]">
                <span className="text-muted-foreground">달성</span>
                <input
                  type="number"
                  name="currentAmount"
                  min={0}
                  defaultValue={item.currentAmount}
                  className="w-full min-w-0 rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent"
                />
              </div>

              <select
                name="status"
                defaultValue={item.status}
                className="rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-[12px] font-semibold outline-none focus:border-accent"
              >
                {PIGGYBANK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PIGGYBANK_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 border-t border-card-border pt-3">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  저장
                </button>
                <button
                  type="submit"
                  formAction={deletePiggyBankItem}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-danger transition-opacity hover:opacity-70"
                >
                  삭제
                </button>
              </div>
            </form>
          );
        })}

        <form
          action={createPiggyBankItem}
          className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-card-border p-4"
        >
          <p className="text-[12.5px] font-bold text-muted-foreground">새 저금통 추가</p>
          <input
            type="text"
            name="title"
            required
            placeholder="이름 (예: 여행 적금)"
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <select
            name="category"
            defaultValue="SAVINGS"
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          >
            {PIGGYBANK_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {PIGGYBANK_CATEGORY_LABEL[category]}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              name="startDate"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
            <input
              type="date"
              name="targetDate"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              name="targetAmount"
              required
              min={1}
              placeholder="목표 금액"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
            <input
              type="number"
              name="currentAmount"
              min={0}
              placeholder="달성 금액"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>
          <select
            name="status"
            defaultValue="PENDING"
            className="rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          >
            {PIGGYBANK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PIGGYBANK_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="self-start rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            추가
          </button>
        </form>
      </div>
    </div>
  );
}
