/**
 * 데모 유저용 저금통 시드 데이터(전부 가상 데이터). 실행할 때마다 기존 걸 지우고 다시 넣는다(idempotent).
 *
 * 실행: npx tsx scripts/seedPiggyBankItems.ts
 */

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { requireSeedUserId } from "./seedUserId";
import type { PiggyBankCategory, PiggyBankItemStatus } from "@/generated/prisma/enums";

const DEMO_USER_ID = requireSeedUserId();

const ITEMS: {
  title: string;
  category: PiggyBankCategory;
  targetAmount: number;
  currentAmount: number;
  startDate?: string;
  targetDate?: string;
  status: PiggyBankItemStatus;
}[] = [
  {
    title: "졸업여행 적금",
    category: "SAVINGS",
    targetAmount: 500_000,
    currentAmount: 315_000,
    startDate: "2026-03-01",
    targetDate: "2026-08-31",
    status: "IN_PROGRESS",
  },
  {
    title: "국내 ETF",
    category: "STOCK",
    targetAmount: 1_000_000,
    currentAmount: 240_000,
    targetDate: "2026-11-30",
    status: "IN_PROGRESS",
  },
  {
    title: "취업 준비 적금",
    category: "SAVINGS",
    targetAmount: 8_000_000,
    currentAmount: 0,
    startDate: "2026-09-01",
    targetDate: "2028-09-30",
    status: "PENDING",
  },
  {
    title: "교통비 저금통",
    category: "PARKING",
    targetAmount: 600_000,
    currentAmount: 240_000,
    status: "IN_PROGRESS",
  },
];

async function main() {
  await prisma.piggyBankItem.deleteMany({ where: { userId: DEMO_USER_ID } });

  await prisma.piggyBankItem.createMany({
    data: ITEMS.map(({ startDate, targetDate, ...rest }) => ({
      userId: DEMO_USER_ID,
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      targetDate: targetDate ? new Date(targetDate) : null,
    })),
  });

  const count = await prisma.piggyBankItem.count({ where: { userId: DEMO_USER_ID } });
  console.log(`저금통 ${count}건 시드 완료`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
