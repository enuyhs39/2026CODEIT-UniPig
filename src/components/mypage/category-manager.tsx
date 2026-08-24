"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createLedgerCategory,
  createPiggyBankCategory,
  deleteLedgerCategory,
  deletePiggyBankCategory,
  updateLedgerCategory,
  updatePiggyBankCategory,
} from "@/app/(dashboard)/mypage/actions";
import type {
  ExpenseCategory,
  IncomeCategory,
  LedgerEntryType,
  PaletteColor,
  PiggyBankCategory,
} from "@/generated/prisma/enums";
import { CategoryColorSelect } from "./category-color-select";
import { FixedCategorySelect } from "./fixed-category-select";
import { cn } from "@/lib/utils";

type CategoryTab = "expense" | "income" | "saving";

type LedgerCategoryView = {
  id: string;
  label: string;
  color: PaletteColor;
  type: LedgerEntryType;
  expenseGroup: ExpenseCategory | null;
  incomeGroup: IncomeCategory | null;
};

type SavingCategoryView = {
  id: string;
  label: string;
  color: PaletteColor;
  group: PiggyBankCategory;
};

type Props = {
  ledgerCategories: LedgerCategoryView[];
  savingCategories: SavingCategoryView[];
};

const TABS: { value: CategoryTab; label: string }[] = [
  { value: "expense", label: "지출" },
  { value: "income", label: "수입" },
  { value: "saving", label: "저금" },
];

const DEFAULT_FIXED_GROUP: Record<CategoryTab, string> = {
  expense: "FOOD",
  income: "allowance",
  saving: "SAVINGS",
};

export function CategoryManager({ ledgerCategories, savingCategories }: Props) {
  const [activeTab, setActiveTab] = useState<CategoryTab>("expense");
  const [createOpen, setCreateOpen] = useState(false);
  const visibleLedgerCategories = useMemo(
    () => ledgerCategories.filter((category) => category.type === (activeTab === "expense" ? "EXPENSE" : "INCOME")),
    [activeTab, ledgerCategories],
  );
  const visibleCount = activeTab === "saving" ? savingCategories.length : visibleLedgerCategories.length;
  const isSaving = activeTab === "saving";

  return (
    <section className="overflow-visible rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">카테고리 관리</h2>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            표시 이름과 색상, 연결할 분류를 관리할 수 있어요. 변경 사항은 자동으로 저장돼요.
          </p>
        </div>
        <button
          type="button"
          aria-expanded={createOpen}
          onClick={() => setCreateOpen((open) => !open)}
          className="rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          {createOpen ? "닫기" : "+ 새 카테고리"}
        </button>
      </div>

      <div className="mt-4 flex gap-1 border-b border-card-border">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setActiveTab(tab.value);
              setCreateOpen(false);
            }}
            className={cn(
              "border-b-2 px-4 py-2 text-[12.5px] font-semibold transition-colors",
              activeTab === tab.value
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {createOpen && (
        <form
          action={isSaving ? createPiggyBankCategory : createLedgerCategory}
          onSubmit={() => setCreateOpen(false)}
          className="mt-4 grid gap-2 rounded-xl border border-dashed border-card-border bg-background/40 p-3 sm:grid-cols-[minmax(120px,1fr)_112px_128px_auto]"
        >
          <input
            type="text"
            name="label"
            required
            maxLength={20}
            placeholder="카테고리 이름"
            className="min-w-0 rounded-lg border border-card-border bg-background px-3 py-2 text-[12.5px] outline-none focus:border-accent"
          />
          <CategoryColorSelect name="color" />
          <FixedCategorySelect
            name={isSaving ? "fixedGroup" : "aiGroup"}
            type={activeTab}
            defaultValue={DEFAULT_FIXED_GROUP[activeTab]}
          />
          <button type="submit" className="rounded-lg bg-accent px-3.5 py-2 text-[12px] font-semibold text-white">
            추가
          </button>
        </form>
      )}

      <div className="mt-3 hidden grid-cols-[minmax(120px,1fr)_112px_128px_88px] gap-2 px-2 text-[10.5px] font-semibold text-muted-foreground sm:grid">
        <span>이름</span>
        <span>색상</span>
        <span>분류</span>
        <span />
      </div>

      <div className="mt-1 divide-y divide-card-border">
        {isSaving
          ? savingCategories.map((category) => (
              <CategoryRow
                key={category.id}
                id={category.id}
                label={category.label}
                color={category.color}
                fixedGroup={category.group}
                tab="saving"
              />
            ))
          : visibleLedgerCategories.map((category) => (
              <CategoryRow
                key={category.id}
                id={category.id}
                label={category.label}
                color={category.color}
                fixedGroup={(category.expenseGroup ?? category.incomeGroup)!}
                tab={activeTab}
              />
            ))}

        {visibleCount === 0 && (
          <p className="py-8 text-center text-[12px] text-muted-foreground">아직 등록된 카테고리가 없어요.</p>
        )}
      </div>
    </section>
  );
}

function CategoryRow({
  id,
  label,
  color,
  fixedGroup,
  tab,
}: {
  id: string;
  label: string;
  color: PaletteColor;
  fixedGroup: string;
  tab: CategoryTab;
}) {
  const isSaving = tab === "saving";
  const formRef = useRef<HTMLFormElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = (delay = 250) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => formRef.current?.requestSubmit(), delay);
  };

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  return (
    <div className="py-2.5">
      <form
        ref={formRef}
        action={isSaving ? updatePiggyBankCategory : updateLedgerCategory}
        className="grid items-center gap-2 sm:grid-cols-[minmax(120px,1fr)_112px_128px_88px]"
      >
        <input type="hidden" name="id" value={id} />
        <input
          type="text"
          name="label"
          required
          maxLength={20}
          defaultValue={label}
          aria-label="카테고리 이름"
          onChange={() => save(600)}
          onBlur={() => save(0)}
          className="min-w-0 rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-[12.5px] font-medium outline-none transition-colors hover:border-card-border focus:border-accent focus:bg-background"
        />
        <CategoryColorSelect name="color" defaultValue={color} onValueChange={() => save()} />
        <FixedCategorySelect
          name={isSaving ? "fixedGroup" : "aiGroup"}
          type={tab}
          defaultValue={fixedGroup}
          onValueChange={() => save()}
        />
        <div className="flex justify-end gap-1">
          <button
            type="submit"
            formAction={isSaving ? deletePiggyBankCategory : deleteLedgerCategory}
            onClick={() => {
              if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            }}
            className="rounded-lg px-2 py-2 text-[11.5px] font-semibold text-danger hover:bg-danger/5"
          >
            삭제
          </button>
        </div>
      </form>
    </div>
  );
}
