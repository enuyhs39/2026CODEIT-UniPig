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
  filterCategories: Category[];
  selectedCategoryId: string;
  defaultDate: string;
  defaultType?: LedgerEntryType;
  typeTabValue: string;
  chartStatus?: "pending" | "done";
  sortValue: "asc" | "desc";
  monthValue: number;
  categoryBoardOpen: boolean;
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

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
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
  filterCategories,
  selectedCategoryId,
  defaultDate,
  defaultType,
  typeTabValue,
  chartStatus,
  sortValue,
  monthValue,
  categoryBoardOpen,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const activeFilterCount = Number(hasCustomRange) + Number(Boolean(selectedCategoryId));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={filterOpen}
          aria-controls="transaction-filter-panel"
          onClick={() => {
            setFilterOpen((value) => !value);
            setCreateOpen(false);
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/30",
            filterOpen || activeFilterCount > 0
              ? "border-accent bg-accent-soft text-accent"
              : "border-card-border bg-card text-muted-foreground hover:border-accent hover:text-accent",
          )}
        >
          <FilterIcon />
          필터
          {activeFilterCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] leading-none text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronIcon open={filterOpen} />
        </button>

        <div className="flex-1" />

        {categories.length > 0 && (
          <button
            type="button"
            aria-expanded={createOpen}
            aria-controls="transaction-create-panel"
            onClick={() => {
              setCreateOpen((value) => !value);
              setFilterOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            새로 만들기
            <ChevronIcon open={createOpen} />
          </button>
        )}
      </div>

      {filterOpen && (
        <div
          id="transaction-filter-panel"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-card-border bg-card p-3 shadow-sm"
        >
          <span className="mr-1 text-[11px] font-semibold text-muted-foreground">정렬·기간</span>
          <a
            href={sortHref}
            className="rounded-lg border border-card-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {sortLabel}
          </a>

          <form method="GET" className="flex flex-wrap items-center gap-1.5">
            <input type="hidden" name="type" value={typeTabValue} />
            {chartStatus && <input type="hidden" name="chart" value={chartStatus} />}
            <input type="hidden" name="sort" value={sortValue} />
            <input type="hidden" name="month" value={monthValue} />
            {categoryBoardOpen && <input type="hidden" name="board" value="category" />}
            <select
              name="category"
              aria-label="카테고리"
              defaultValue={selectedCategoryId}
              className="rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-[12px] outline-none focus:border-accent"
            >
              <option value="">전체 카테고리</option>
              {filterCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {typeTabValue === "all" ? `${category.type === "EXPENSE" ? "지출" : "수입"} · ` : ""}
                  {category.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="from"
              aria-label="조회 시작일"
              defaultValue={fromValue}
              className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
            />
            <span className="text-[12px] text-muted-foreground">~</span>
            <input
              type="date"
              name="to"
              aria-label="조회 종료일"
              defaultValue={toValue}
              className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              필터 적용
            </button>
            {hasCustomRange && (
              <a href={resetHref} className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground">
                초기화
              </a>
            )}
          </form>
        </div>
      )}

      {createOpen && (
        <form
          id="transaction-create-panel"
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
