"use client";

import { useState } from "react";
import {
  createPiggyBankItem,
  deletePiggyBankItem,
  updatePiggyBankItem,
} from "@/app/(dashboard)/piggybank/actions";
import type { PaletteColor, PiggyBankCategory, PiggyBankItemStatus } from "@/generated/prisma/enums";
import { PALETTE_BADGE_CLASSES } from "@/lib/categoryColors";
import {
  PIGGYBANK_CATEGORY_COLOR,
  PIGGYBANK_CATEGORY_LABEL,
  PIGGYBANK_STATUSES,
  PIGGYBANK_STATUS_LABEL,
} from "@/lib/piggyBankCategories";
import { cn } from "@/lib/utils";

type PiggyBankItemView = {
  id: string;
  title: string;
  category: PiggyBankCategory;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  targetDate: string;
  status: PiggyBankItemStatus;
  note: string;
  categoryOption: CategoryOptionView | null;
};

type CategoryOptionView = {
  id: string;
  label: string;
  color: PaletteColor;
  group: PiggyBankCategory;
};

type Props = { items: PiggyBankItemView[]; categories: CategoryOptionView[] };

const CATEGORY_ICON: Record<PiggyBankCategory, string> = {
  PARKING: "🚕",
  SAVINGS: "💰",
  STOCK: "📈",
  OTHER: "📌",
};

const fieldClass =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-[12.5px] outline-none transition-colors focus:border-accent";

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatDate(value: string): string {
  if (!value) return "날짜 미정";
  const [year, month, day] = value.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

function progressOf(item: PiggyBankItemView): number {
  return item.targetAmount > 0
    ? Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100))
    : 0;
}

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

function CategorySelect({
  categories,
  defaultValue,
}: {
  categories: CategoryOptionView[];
  defaultValue: string;
}) {
  return (
    <select name="categoryOptionId" defaultValue={defaultValue} className={fieldClass}>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.label}
        </option>
      ))}
    </select>
  );
}

function StatusSelect({ defaultValue }: { defaultValue: PiggyBankItemStatus }) {
  return (
    <select name="status" defaultValue={defaultValue} className={fieldClass}>
      {PIGGYBANK_STATUSES.map((status) => (
        <option key={status} value={status}>
          {PIGGYBANK_STATUS_LABEL[status]}
        </option>
      ))}
    </select>
  );
}

export function PiggyBankBoard({ items, categories }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const defaultCategoryId =
    categories.find((category) => category.group === "SAVINGS")?.id ?? categories[0]?.id ?? "";

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          aria-expanded={createOpen}
          onClick={() => setCreateOpen((open) => !open)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          저금통 새로 만들기
          <ChevronIcon open={createOpen} />
        </button>
      </div>

      {createOpen && (
        <form
          action={createPiggyBankItem}
          onSubmit={() => setCreateOpen(false)}
          className="ml-auto grid w-full max-w-xl grid-cols-2 gap-2.5 rounded-2xl border border-dashed border-card-border bg-card p-4 shadow-sm"
        >
          <p className="col-span-2 text-[12.5px] font-bold text-muted-foreground">새 저금통 추가</p>
          <input type="text" name="title" required placeholder="이름 (예: 여행 적금)" className={cn(fieldClass, "col-span-2")} />
          <CategorySelect categories={categories} defaultValue={defaultCategoryId} />
          <StatusSelect defaultValue="PENDING" />
          <input type="date" name="startDate" aria-label="시작일" className={fieldClass} />
          <input type="date" name="targetDate" aria-label="목표일" className={fieldClass} />
          <input type="number" name="targetAmount" required min={1} placeholder="목표 금액" className={fieldClass} />
          <input type="number" name="currentAmount" min={0} placeholder="달성 금액" className={fieldClass} />
          <button type="submit" className="col-span-2 justify-self-start rounded-lg bg-accent px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90">
            추가
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const progress = progressOf(item);
          const displayCategory = item.categoryOption ?? {
            id: "",
            label: PIGGYBANK_CATEGORY_LABEL[item.category],
            color: PIGGYBANK_CATEGORY_COLOR[item.category],
            group: item.category,
          };
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`${item.title} 저금통 열기`}
              onClick={() => setSelectedId(item.id)}
              className="flex min-h-44 flex-col rounded-xl border border-card-border bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
            >
              <div className="flex w-full items-start gap-1.5">
                <span className="text-base leading-5">{CATEGORY_ICON[displayCategory.group]}</span>
                <strong className="min-w-0 flex-1 truncate text-[13px] font-semibold">{item.title}</strong>
                <span className="text-[15px] leading-4 text-muted-foreground">•••</span>
              </div>
              <span className={cn("mt-2 w-fit rounded px-1.5 py-0.5 text-[9.5px] font-semibold", PALETTE_BADGE_CLASSES[displayCategory.color])}>
                {displayCategory.label}
              </span>
              <p className="mt-3 text-[11.5px] tabular-nums">{formatWon(item.targetAmount)}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-7 text-[10.5px] tabular-nums text-muted-foreground">{progress}%</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-track">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <p className="mt-2 text-[10.5px] tabular-nums text-muted-foreground">{formatWon(item.currentAmount)}</p>
              <p className="mt-auto pt-2 text-[10px] leading-relaxed text-muted-foreground">
                {item.startDate && `${formatDate(item.startDate)} ~ `}{formatDate(item.targetDate)}
              </p>
            </button>
          );
        })}

        {items.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-card-border py-12 text-center text-[12.5px] text-muted-foreground">
            아직 저금통이 없어요. 새 저금통을 만들어보세요.
          </div>
        )}
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label={`${selectedItem.title} 상세 메모`} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <span className="text-4xl">{CATEGORY_ICON[selectedItem.categoryOption?.group ?? selectedItem.category]}</span>
              <button type="button" aria-label="상세 창 닫기" onClick={() => setSelectedId(null)} className="rounded-lg px-2 py-1 text-lg text-muted-foreground hover:bg-background hover:text-foreground">
                ×
              </button>
            </div>

            <form action={updatePiggyBankItem} onSubmit={() => setSelectedId(null)} className="mt-4 space-y-5">
              <input type="hidden" name="id" value={selectedItem.id} />
              <input type="text" name="title" required defaultValue={selectedItem.title} aria-label="저금통 이름" className="w-full border-none bg-transparent px-0 text-3xl font-semibold tracking-[-0.03em] outline-none" />

              <div className="grid grid-cols-[88px_1fr] items-center gap-x-3 gap-y-2.5 text-[12px]">
                <span className="text-muted-foreground">구분</span>
                <CategorySelect
                  categories={categories}
                  defaultValue={
                    selectedItem.categoryOption?.id ??
                    categories.find((category) => category.group === selectedItem.category)?.id ??
                    defaultCategoryId
                  }
                />
                <span className="text-muted-foreground">기간</span>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input type="date" name="startDate" aria-label="시작일" defaultValue={selectedItem.startDate} className={fieldClass} />
                  <span className="text-muted-foreground">~</span>
                  <input type="date" name="targetDate" aria-label="목표일" defaultValue={selectedItem.targetDate} className={fieldClass} />
                </div>
                <span className="text-muted-foreground">목표 금액</span>
                <input type="number" name="targetAmount" required min={1} defaultValue={selectedItem.targetAmount} className={fieldClass} />
                <span className="text-muted-foreground">달성 금액</span>
                <input type="number" name="currentAmount" required min={0} defaultValue={selectedItem.currentAmount} className={fieldClass} />
                <span className="text-muted-foreground">상태</span>
                <StatusSelect defaultValue={selectedItem.status} />
              </div>

              <div className="border-t border-card-border pt-5">
                <label htmlFor={`note-${selectedItem.id}`} className="text-[12px] font-semibold text-muted-foreground">메모</label>
                <textarea
                  id={`note-${selectedItem.id}`}
                  name="note"
                  defaultValue={selectedItem.note}
                  placeholder="필요한 내용, 계획, 체크리스트 등을 자유롭게 적어보세요."
                  className="mt-2 min-h-48 w-full resize-y rounded-xl border border-card-border bg-background p-3 text-[13px] leading-6 outline-none transition-colors focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-card-border pt-4">
                <button type="submit" formAction={deletePiggyBankItem} className="mr-auto rounded-lg px-3 py-2 text-[12px] font-semibold text-danger hover:bg-danger/5">삭제</button>
                <button type="button" onClick={() => setSelectedId(null)} className="rounded-lg border border-card-border px-3.5 py-2 text-[12px] font-semibold text-muted-foreground">취소</button>
                <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
