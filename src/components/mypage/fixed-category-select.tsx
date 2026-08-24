import type { ExpenseCategory, IncomeCategory, PiggyBankCategory } from "@/generated/prisma/enums";
import {
  EXPENSE_GROUPS,
  EXPENSE_GROUP_LABEL,
  INCOME_GROUPS,
  INCOME_GROUP_LABEL,
} from "@/lib/aiCategoryGroups";
import {
  PIGGYBANK_CATEGORIES,
  PIGGYBANK_CATEGORY_LABEL,
} from "@/lib/piggyBankCategories";

type CategoryTab = "expense" | "income" | "saving";

export function FixedCategorySelect({
  name,
  type,
  defaultValue,
  onValueChange,
}: {
  name: string;
  type: CategoryTab;
  defaultValue: string;
  onValueChange?: () => void;
}) {
  return (
    <select
      name={name}
      aria-label="분류"
      defaultValue={defaultValue}
      onChange={onValueChange}
      className="min-w-28 rounded-lg border border-card-border bg-background px-2.5 py-2 text-[12px] outline-none focus:border-accent"
    >
      {type === "expense" &&
        EXPENSE_GROUPS.map((group: ExpenseCategory) => (
          <option key={group} value={group}>
            {EXPENSE_GROUP_LABEL[group]}
          </option>
        ))}
      {type === "income" &&
        INCOME_GROUPS.map((group: IncomeCategory) => (
          <option key={group} value={group}>
            {INCOME_GROUP_LABEL[group]}
          </option>
        ))}
      {type === "saving" &&
        PIGGYBANK_CATEGORIES.map((group: PiggyBankCategory) => (
          <option key={group} value={group}>
            {PIGGYBANK_CATEGORY_LABEL[group]}
          </option>
        ))}
    </select>
  );
}
