/**
 * 데모 유저용 지출/수입 "구분" 옵션 시드 데이터. 실행할 때마다 기존 걸 지우고 다시 넣는다(idempotent).
 * LedgerEntry가 categoryId로 참조하므로 seedLedgerEntries.ts보다 먼저 실행해야 한다.
 *
 * 실행: npx tsx scripts/seedLedgerCategories.ts
 */

import "dotenv/config";
import { DEMO_USER_ID } from "@/config";
import { prisma } from "@/lib/prisma";
import type { ExpenseCategory, IncomeCategory, LedgerEntryType, PaletteColor } from "@/generated/prisma/enums";

type CategorySeed = {
  label: string;
  color: PaletteColor;
  type: LedgerEntryType;
  expenseGroup?: ExpenseCategory;
  incomeGroup?: IncomeCategory;
};

const CATEGORIES: CategorySeed[] = [
  { label: "일상", color: "GRAY", type: "EXPENSE", expenseGroup: "OTHER" },
  { label: "생필품", color: "GREEN", type: "EXPENSE", expenseGroup: "SHOPPING" },
  { label: "경조사", color: "GREEN", type: "EXPENSE", expenseGroup: "OTHER" },
  { label: "고정지출", color: "RED", type: "EXPENSE", expenseGroup: "OTHER" },
  { label: "약속", color: "PINK", type: "EXPENSE", expenseGroup: "FOOD" },
  { label: "대외활동", color: "PURPLE", type: "EXPENSE", expenseGroup: "OTHER" },
  { label: "문화/전시", color: "BROWN", type: "EXPENSE", expenseGroup: "OTHER" },
  { label: "쇼핑", color: "YELLOW", type: "EXPENSE", expenseGroup: "SHOPPING" },
  { label: "배달음식", color: "ORANGE", type: "EXPENSE", expenseGroup: "FOOD" },
  { label: "관리", color: "BLUE", type: "EXPENSE", expenseGroup: "OTHER" },
  { label: "적금", color: "BLUE", type: "EXPENSE", expenseGroup: "OTHER" },
  { label: "적금*파킹", color: "BLUE", type: "EXPENSE", expenseGroup: "OTHER" },
  { label: "적금*여행", color: "BLUE", type: "EXPENSE", expenseGroup: "OTHER" },
  { label: "용돈", color: "DEFAULT", type: "INCOME", incomeGroup: "allowance" },
  { label: "알바", color: "GRAY", type: "INCOME", incomeGroup: "salary" },
  { label: "장학금", color: "PURPLE", type: "INCOME", incomeGroup: "scholarship" },
];

async function main() {
  await prisma.ledgerEntry.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.ledgerCategory.deleteMany({ where: { userId: DEMO_USER_ID } });

  await prisma.ledgerCategory.createMany({
    data: CATEGORIES.map((category, index) => ({
      userId: DEMO_USER_ID,
      label: category.label,
      color: category.color,
      type: category.type,
      expenseGroup: category.expenseGroup ?? null,
      incomeGroup: category.incomeGroup ?? null,
      sortOrder: index,
    })),
  });

  const count = await prisma.ledgerCategory.count({ where: { userId: DEMO_USER_ID } });
  console.log(`구분 ${count}건 시드 완료`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
