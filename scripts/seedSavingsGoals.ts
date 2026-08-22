/**
 * 데모 유저용 저축 목표 시드 데이터. 실행할 때마다 기존 걸 지우고 다시 넣는다(idempotent).
 *
 * 실행: npx tsx scripts/seedSavingsGoals.ts
 */

import "dotenv/config";
import { DEMO_USER_ID } from "@/config";
import { prisma } from "@/lib/prisma";

async function main() {
  await prisma.savingsGoal.deleteMany({ where: { userId: DEMO_USER_ID } });

  await prisma.savingsGoal.createMany({
    data: [
      {
        userId: DEMO_USER_ID,
        title: "25AI 여행적금",
        targetAmount: 550_000,
        currentAmount: 350_000,
        targetDate: new Date("2026-12-31"),
        status: "IN_PROGRESS",
      },
      {
        userId: DEMO_USER_ID,
        title: "parking",
        targetAmount: 1_000_000,
        currentAmount: 500_000,
        targetDate: null,
        status: "IN_PROGRESS",
      },
      {
        userId: DEMO_USER_ID,
        title: "to.24 청년미래적금",
        targetAmount: 10_000_000,
        currentAmount: 0,
        targetDate: new Date("2028-12-31"),
        status: "PENDING",
      },
      {
        userId: DEMO_USER_ID,
        title: "ETF",
        targetAmount: 1_200_000,
        currentAmount: 0,
        targetDate: new Date("2026-08-31"),
        status: "PENDING",
      },
    ],
  });

  const count = await prisma.savingsGoal.count({ where: { userId: DEMO_USER_ID } });
  console.log(`저축 목표 ${count}건 시드 완료`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
