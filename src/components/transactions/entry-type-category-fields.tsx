"use client";

import { useState } from "react";
import type { LedgerEntryType } from "@/generated/prisma/enums";

type Category = { id: string; label: string; type: LedgerEntryType };

export function EntryTypeCategoryFields({ categories }: { categories: Category[] }) {
  const [type, setType] = useState<LedgerEntryType>("EXPENSE");
  const filtered = categories.filter((category) => category.type === type);

  return (
    <>
      <select
        name="type"
        value={type}
        onChange={(e) => setType(e.target.value as LedgerEntryType)}
        className="rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
      >
        <option value="EXPENSE">지출</option>
        <option value="INCOME">수입</option>
      </select>
      <select
        key={type}
        name="categoryId"
        required
        defaultValue=""
        className="rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
      >
        <option value="" disabled>
          구분 선택
        </option>
        {filtered.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>
    </>
  );
}
