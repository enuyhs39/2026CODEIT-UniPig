/**
 * 데모 유저용 지출/수입 계획표 시드 데이터(전부 가상 데이터). 실행할 때마다 기존 걸 지우고 다시 넣는다(idempotent).
 * seedLedgerCategories.ts를 먼저 실행해서 구분 목록이 있어야 한다.
 *
 * 실행: npx tsx scripts/seedLedgerCategories.ts && npx tsx scripts/seedLedgerEntries.ts
 */

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { requireSeedUserId } from "./seedUserId";
import type { LedgerEntryType } from "@/generated/prisma/enums";

const DEMO_USER_ID = requireSeedUserId();

const ENTRIES: { date: string; type: LedgerEntryType; category: string; description: string; amount: number; isDone: boolean }[] = [
  { date: "2026-08-01", type: "INCOME", category: "용돈", description: "이번 달 용돈", amount: 400_000, isDone: true },
  { date: "2026-08-05", type: "INCOME", category: "알바", description: "카페 알바비", amount: 630_000, isDone: true },
  { date: "2026-08-03", type: "EXPENSE", category: "생필품", description: "생필품 구매", amount: 30_000, isDone: true },
  { date: "2026-08-06", type: "EXPENSE", category: "쇼핑", description: "여름 옷 구매", amount: 89_000, isDone: true },
  { date: "2026-08-09", type: "EXPENSE", category: "약속", description: "친구 모임", amount: 25_000, isDone: true },
  { date: "2026-08-12", type: "EXPENSE", category: "대외활동", description: "동아리 활동비", amount: 15_000, isDone: true },
  { date: "2026-08-14", type: "EXPENSE", category: "적금", description: "적금 자동이체", amount: 200_000, isDone: true },
  { date: "2026-08-16", type: "EXPENSE", category: "쇼핑", description: "생활용품 구매", amount: 31_000, isDone: true },
  { date: "2026-08-18", type: "EXPENSE", category: "경조사", description: "지인 축하 선물", amount: 30_000, isDone: true },
  { date: "2026-08-20", type: "EXPENSE", category: "일상", description: "교통비", amount: 4_000, isDone: true },
  { date: "2026-08-25", type: "EXPENSE", category: "약속", description: "저녁 약속", amount: 32_000, isDone: false },
  { date: "2026-08-28", type: "EXPENSE", category: "약속", description: "생일 축하 모임", amount: 30_000, isDone: false },
  { date: "2026-08-31", type: "INCOME", category: "장학금", description: "국가장학금 입금 예정", amount: 500_000, isDone: false },
];

async function main() {
  await prisma.ledgerEntry.deleteMany({ where: { userId: DEMO_USER_ID } });

  const categories = await prisma.ledgerCategory.findMany({ where: { userId: DEMO_USER_ID } });
  const categoryIdByLabel = new Map(categories.map((c) => [c.label, c.id]));

  const data = ENTRIES.map(({ category, date, ...rest }) => {
    const categoryId = categoryIdByLabel.get(category);
    if (!categoryId) {
      throw new Error(`구분 "${category}"이(가) 없어요. seedLedgerCategories.ts를 먼저 실행하세요.`);
    }
    return { userId: DEMO_USER_ID, categoryId, date: new Date(date), ...rest };
  });

  await prisma.ledgerEntry.createMany({ data });

  const count = await prisma.ledgerEntry.count({ where: { userId: DEMO_USER_ID } });
  console.log(`지출/수입 내역 ${count}건 시드 완료`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
