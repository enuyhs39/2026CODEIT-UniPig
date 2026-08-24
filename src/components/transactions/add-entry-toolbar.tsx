"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { EntryTypeCategoryFields } from "./entry-type-category-fields";
import { createLedgerEntry } from "@/app/(dashboard)/transactions/actions";
import type { LedgerEntryType } from "@/generated/prisma/enums";

type Category = { id: string; label: string; type: LedgerEntryType };

type Props = {
  sortLabel: string;
  sortHref: string;
  fromValue: string;
  toValue: string;
  hasCustomRange: boolean;
  resetHref: string;
  categories: Category[];
  defaultDate: string;
  defaultType?: LedgerEntryType;
  typeTabValue: string;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={cn("transition-transform", open && "rotate-180")}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function AddEntryToolbar({
  sortLabel,
  sortHref,
  fromValue,
  toValue,
  hasCustomRange,
  resetHref,
  categories,
  defaultDate,
  defaultType,
  typeTabValue,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={sortHref}
          className="rounded-lg border border-card-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          {sortLabel}
        </a>

        <form method="GET" className="flex items-center gap-1.5">
          <input type="hidden" name="type" value={typeTabValue} />
          <input
            type="date"
            name="from"
            defaultValue={fromValue}
            className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
          />
          <span className="text-[12px] text-muted-foreground">~</span>
          <input
            type="date"
            name="to"
            defaultValue={toValue}
            className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            기간 적용
          </button>
          {hasCustomRange && (
            <a href={resetHref} className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground">
              초기화
            </a>
          )}
        </form>

        <div className="flex-1" />

        {categories.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            새로 만들기
            <ChevronIcon open={open} />
          </button>
        )}
      </div>

      {open && (
        <form
          action={createLedgerEntry}
          className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-card-border p-4"
        >
          <p className="text-[12.5px] font-bold text-muted-foreground">새 항목 추가</p>
          <div className="flex flex-wrap gap-2">
            <EntryTypeCategoryFields categories={categories} defaultType={defaultType} />
            <input
              type="date"
              name="date"
              required
              defaultValue={defaultDate}
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
