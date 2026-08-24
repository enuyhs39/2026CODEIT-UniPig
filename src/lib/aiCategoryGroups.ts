import type { ExpenseCategory, IncomeCategory } from "@/generated/prisma/enums";

export const EXPENSE_GROUPS: ExpenseCategory[] = ["FOOD", "SHOPPING", "CULTURE", "EDUCATION", "NECESSITIES", "OTHER"];

export const EXPENSE_GROUP_LABEL: Record<ExpenseCategory, string> = {
  FOOD: "식비",
  SHOPPING: "쇼핑",
  CULTURE: "문화/여가",
  EDUCATION: "교육/자기계발",
  NECESSITIES: "생필품/경조사",
  OTHER: "기타",
};

export const INCOME_GROUPS: IncomeCategory[] = ["allowance", "salary", "scholarship", "cashback", "irregular"];

export const INCOME_GROUP_LABEL: Record<IncomeCategory, string> = {
  allowance: "용돈",
  salary: "알바",
  scholarship: "장학금",
  cashback: "캐시백",
  irregular: "기타",
};
