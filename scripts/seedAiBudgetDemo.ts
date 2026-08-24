/**
 * unipigdemo 계정의 AI피그 시연 데이터를 일관된 이야기로 다시 만든다.
 * Transaction/BudgetPlan/FixedExpense/UserPreference 중 AI 예산에 필요한 값만 다루며,
 * 사용자가 직접 관리하는 지출·수입 보드(LedgerEntry)와 저금통 데이터는 건드리지 않는다.
 *
 * 실행: npx tsx scripts/seedAiBudgetDemo.ts
 */

import { config } from "dotenv";
import { DEFAULT_BUDGET_WEIGHTS, type ExpenseCategory } from "@/config";

const DEMO_USERNAME = "unipigdemo";
const TARGET_MONTH = "2026-08";

config({ path: ".env.local" });
config();

type TransactionSeed = {
  userId: string;
  occurredAt: Date;
  amount: number;
  rawDesc: string;
  counterparty: string;
};

function date(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function monthAt(index: number): { year: number; month: number } {
  const value = new Date(Date.UTC(2025, 8 + index, 1));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1 };
}

async function findDemoUserId(): Promise<string> {
  const [{ createSupabaseAdminClient }, { toSyntheticEmail }] = await Promise.all([
    import("@/lib/supabase/admin"),
    import("@/lib/username"),
  ]);
  const admin = createSupabaseAdminClient();
  const email = toSyntheticEmail(DEMO_USERNAME);
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`${DEMO_USERNAME} 인증 계정을 찾을 수 없습니다.`);
  return user.id;
}

function addExpense(
  rows: TransactionSeed[],
  userId: string,
  year: number,
  month: number,
  day: number,
  amount: number,
  counterparty: string,
) {
  rows.push({
    userId,
    occurredAt: date(year, month, day),
    amount: -amount,
    rawDesc: `${counterparty} 결제`,
    counterparty,
  });
}

function buildTransactions(userId: string): TransactionSeed[] {
  const rows: TransactionSeed[] = [];
  const salaryByMonth = [550, 570, 560, 590, 575, 600, 565, 580, 595, 570, 585, 580];

  for (let index = 0; index < 12; index++) {
    const { year, month } = monthAt(index);

    // 매달 꾸준한 두 소득원. AI가 이번 달에도 들어올 가능성이 높은 수입으로 판단한다.
    rows.push({
      userId,
      occurredAt: date(year, month, 4 + (index % 2)),
      amount: 400_000,
      rawDesc: "부모님 용돈",
      counterparty: "부모님",
    });
    rows.push({
      userId,
      occurredAt: date(year, month, 10 + (index % 3) - 1),
      amount: salaryByMonth[index] * 1_000,
      rawDesc: "교내 카페 알바 급여",
      counterparty: "교내카페(주)",
    });

    // 2026년 3월까지만 들어온 과외비. AI가 종료 가능성이 높은 수입으로 구분하는 시연 장치다.
    if (index < 7) {
      rows.push({
        userId,
        occurredAt: date(year, month, 20),
        amount: 180_000,
        rawDesc: "주말 과외 알바 급여",
        counterparty: "주말과외",
      });
    }

    // 소액이지만 반복되는 캐시백.
    rows.push({
      userId,
      occurredAt: date(year, month, 16),
      amount: 6_000 + (index % 3) * 1_000,
      rawDesc: "신한카드 캐시백",
      counterparty: "신한카드",
    });

    if (index < 11) {
      // 과거 11개월은 월별 소비 비중이 안정적으로 보이도록 구성한다.
      addExpense(rows, userId, year, month, 6, 76_000, "김밥천국");
      addExpense(rows, userId, year, month, 13, 88_000, "한솥도시락");
      addExpense(rows, userId, year, month, 23, 76_000, "맘스터치");
      addExpense(rows, userId, year, month, 8, 68_000, "무신사");
      addExpense(rows, userId, year, month, 19, 52_000, "올리브영");
      addExpense(rows, userId, year, month, 12, 44_000, "CGV");
      addExpense(rows, userId, year, month, 25, 36_000, "PC방");
      addExpense(rows, userId, year, month, 7, 55_000, "교보문고");
      addExpense(rows, userId, year, month, 21, 40_000, "인프런");
      addExpense(rows, userId, year, month, 9, 44_000, "서울교통공사");
      addExpense(rows, userId, year, month, 22, 28_000, "카카오T");
      addExpense(rows, userId, year, month, 14, 36_000, "GS25");
      addExpense(rows, userId, year, month, 27, 28_000, "약국");
    }
  }

  // 이번 달은 25일 기준으로 예산 대비 40~70% 정도 사용한 자연스러운 진행 상황이다.
  addExpense(rows, userId, 2026, 8, 6, 64_000, "김밥천국");
  addExpense(rows, userId, 2026, 8, 12, 72_000, "한솥도시락");
  addExpense(rows, userId, 2026, 8, 20, 54_000, "맘스터치");
  addExpense(rows, userId, 2026, 8, 8, 50_000, "무신사");
  addExpense(rows, userId, 2026, 8, 18, 35_000, "올리브영");
  addExpense(rows, userId, 2026, 8, 11, 30_000, "CGV");
  addExpense(rows, userId, 2026, 8, 22, 20_000, "PC방");
  addExpense(rows, userId, 2026, 8, 9, 35_000, "교보문고");
  addExpense(rows, userId, 2026, 8, 19, 25_000, "인프런");
  addExpense(rows, userId, 2026, 8, 7, 32_000, "서울교통공사");
  addExpense(rows, userId, 2026, 8, 21, 23_000, "카카오T");
  addExpense(rows, userId, 2026, 8, 14, 20_000, "GS25");
  addExpense(rows, userId, 2026, 8, 23, 15_000, "약국");

  return rows;
}

async function main() {
  // 환경변수를 읽은 뒤 Prisma를 불러와야 adapter가 올바른 원격 연결 문자열로 초기화된다.
  const { prisma } = await import("@/lib/prisma");
  const userId = await findDemoUserId();
  const rows = buildTransactions(userId);

  const aiAllocations: Record<ExpenseCategory, number> = {
    식비: 279_000,
    쇼핑: 139_000,
    "문화/여가": 93_000,
    "교육/자기계발": 110_000,
    "생필품/경조사": 84_000,
    기타: 75_000,
  };
  const confirmedAllocations: Record<ExpenseCategory, number> = {
    식비: 270_000,
    쇼핑: 140_000,
    "문화/여가": 95_000,
    "교육/자기계발": 110_000,
    "생필품/경조사": 85_000,
    기타: 80_000,
  };

  await prisma.$transaction(async (tx) => {
    await tx.incomeEvent.deleteMany({ where: { transaction: { userId } } });
    await tx.transaction.deleteMany({ where: { userId } });
    await tx.sourceTermination.deleteMany({ where: { userId } });
    await tx.budgetPlan.deleteMany({ where: { userId } });

    await tx.transaction.createMany({ data: rows });
    await tx.userPreference.upsert({
      where: { userId },
      update: { weights: DEFAULT_BUDGET_WEIGHTS, savingRate: 0.1 },
      create: { userId, weights: DEFAULT_BUDGET_WEIGHTS, savingRate: 0.1 },
    });

    const fixedExpenses = [
      { category: "TRANSPORT" as const, amount: 35_000 },
      { category: "SUBSCRIPTION" as const, amount: 12_000 },
      { category: "UTILITIES" as const, amount: 30_000 },
      { category: "OTHER" as const, amount: 3_000 },
    ];
    for (const item of fixedExpenses) {
      await tx.fixedExpense.upsert({
        where: { userId_category: { userId, category: item.category } },
        update: { amount: item.amount },
        create: { userId, ...item },
      });
    }

    await tx.budgetPlan.create({
      data: {
        userId,
        targetMonth: TARGET_MONTH,
        baseIncome: 950_000,
        aiAllocations,
        allocations: confirmedAllocations,
        saving: 90_000,
        status: "CONFIRMED",
      },
    });
  });

  const currentMonthRows = rows.filter(
    (row) => row.occurredAt >= date(2026, 8, 1) && row.occurredAt < date(2026, 9, 1),
  );
  const currentIncome = currentMonthRows.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  const currentExpense = currentMonthRows.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0);

  console.log(`AI피그 데모 시드 완료: 거래 ${rows.length}건`);
  console.log(`2026-08 실제 수입 ${currentIncome.toLocaleString("ko-KR")}원 / 지출 ${currentExpense.toLocaleString("ko-KR")}원`);
  console.log("확정 예산 780,000원 / 고정지출 80,000원 / 저축 90,000원");

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
