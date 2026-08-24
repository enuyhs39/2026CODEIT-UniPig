/**
 * 홈 화면 검증용 8월 거래 데이터. A의 generateDummy.ts(2025년, 소득분류 테스트용)와는
 * 별개 — 실제 "이번 달" 기준으로 홈 화면을 확인하기 위한 최소 데모 데이터. idempotent.
 *
 * 실행: npx tsx scripts/seedDemoTransactions.ts
 */

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { requireSeedUserId } from "./seedUserId";

const DEMO_USER_ID = requireSeedUserId();

const YEAR = 2026;
const MONTH = 8; // 1-indexed

function d(day: number): Date {
  return new Date(Date.UTC(YEAR, MONTH - 1, day));
}

async function main() {
  await prisma.transaction.deleteMany({
    where: {
      userId: DEMO_USER_ID,
      occurredAt: { gte: d(1), lt: new Date(Date.UTC(YEAR, MONTH, 1)) },
    },
  });

  await prisma.transaction.createMany({
    data: [
      { userId: DEMO_USER_ID, occurredAt: d(1), amount: 400_000, rawDesc: "용돈", counterparty: "가족" },
      { userId: DEMO_USER_ID, occurredAt: d(14), amount: 1_100_000, rawDesc: "아르바이트 급여", counterparty: "카페드림(주)" },
      { userId: DEMO_USER_ID, occurredAt: d(15), amount: -30_000, rawDesc: "생필품 구매", counterparty: "쿠팡" },
      { userId: DEMO_USER_ID, occurredAt: d(16), amount: -25_000, rawDesc: "생활용품 구매", counterparty: "쿠팡" },
      { userId: DEMO_USER_ID, occurredAt: d(16), amount: -92_000, rawDesc: "가방 구매", counterparty: "무신사" },
      { userId: DEMO_USER_ID, occurredAt: d(17), amount: -13_800, rawDesc: "경조사비", counterparty: "카카오페이" },
      { userId: DEMO_USER_ID, occurredAt: d(18), amount: -43_000, rawDesc: "동아리 활동비", counterparty: "현금" },
      { userId: DEMO_USER_ID, occurredAt: d(20), amount: -166_000, rawDesc: "의류 구매", counterparty: "무신사" },
    ],
  });

  const count = await prisma.transaction.count({
    where: { userId: DEMO_USER_ID, occurredAt: { gte: d(1), lt: new Date(Date.UTC(YEAR, MONTH, 1)) } },
  });
  console.log(`${YEAR}-${MONTH} 거래 ${count}건 시드 완료`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
