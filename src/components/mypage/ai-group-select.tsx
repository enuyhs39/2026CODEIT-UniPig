import {
  EXPENSE_GROUPS,
  EXPENSE_GROUP_LABEL,
  INCOME_GROUPS,
  INCOME_GROUP_LABEL,
} from "@/lib/aiCategoryGroups";

export function AiGroupSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-[12px] outline-none focus:border-accent"
    >
      <optgroup label="지출">
        {EXPENSE_GROUPS.map((group) => (
          <option key={group} value={group}>
            {EXPENSE_GROUP_LABEL[group]}
          </option>
        ))}
      </optgroup>
      <optgroup label="수입">
        {INCOME_GROUPS.map((group) => (
          <option key={group} value={group}>
            {INCOME_GROUP_LABEL[group]}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
