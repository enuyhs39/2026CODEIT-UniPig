/**
 * 가상 대학생 1명의 12개월치 거래내역을 생성한다. "오늘"(실행 시점) 기준 최근 12개월 —
 * 고정 연도가 아니라 상대적인 창이라, 언제 다시 돌려도(데모 당일 재실행 포함) 항상
 * "최근 데이터"가 되도록 설계했다. `--seed`로 랜덤값은 재현 가능하게 만들고,
 * CSV 저장 + Supabase DB 시드를 둘 다 한다.
 * 창의 마지막 4개월은 카페 알바 수입이 끊기는 게 이 데이터의 핵심 — T5 생존확률 검증 + 데모 장치.
 *
 * 실행: npx tsx scripts/generateDummy.ts --seed 42
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { mulberry32 } from "@/core/stats";
import { MERCHANT_CATEGORY_MAP, SEASONAL_FACTORS, type ExpenseCategory } from "@/config";
import { prisma } from "@/lib/prisma";

/** 로그인 없이 로컬에서 더미데이터를 돌릴 때 쓰는 테스트 유저 ID. 실제 앱은 인증된 userId를 쓴다. */
const DEMO_USER_ID = "demo-user";

const WINDOW_MONTHS = 12;
const CAFE_ACTIVE_COUNT = 8; // 창의 첫 8개월만 활성, 나머지 4개월(가장 최근)은 중단

type TxRow = {
  userId: string;
  occurredAt: Date;
  amount: number;
  rawDesc: string;
  counterparty: string;
};

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[randInt(rng, 0, items.length - 1)];
}

/** 창 안의 i번째(0=가장 오래된 달, WINDOW_MONTHS-1=이번 달) 달의 (year, month 1~12). */
function windowMonth(now: Date, i: number): { year: number; month: number } {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (WINDOW_MONTHS - 1) + i, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function dateUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

const CAFE_COUNTERPARTY = "카페드림(주)";
const CAFE_DESC = "카페드림(주) 급여";

const CASHBACK_SOURCES = [
  { counterparty: "신한카드", desc: "신한카드 캐시백 적립" },
  { counterparty: "삼성카드", desc: "삼성카드 리워드 지급" },
  { counterparty: "현대카드", desc: "현대카드 포인트 환급" },
] as const;

// 가맹점 목록은 config.ts의 MERCHANT_CATEGORY_MAP이 단일 소스 — classifyExpense.ts(T8)와 공유.
const EXPENSE_RANGE_BY_CATEGORY: Record<ExpenseCategory, readonly [number, number]> = {
  식비: [5, 15],
  쇼핑: [10, 100],
  "문화/여가": [10, 30],
  "교육/자기계발": [10, 50],
  "생필품/경조사": [3, 50],
  기타: [1, 50],
};

const MERCHANTS_BY_CATEGORY = Object.entries(MERCHANT_CATEGORY_MAP).reduce(
  (acc, [merchant, category]) => {
    (acc[category] ??= []).push(merchant);
    return acc;
  },
  {} as Record<ExpenseCategory, string[]>,
);

const EXPENSE_CATEGORIES = (Object.keys(EXPENSE_RANGE_BY_CATEGORY) as ExpenseCategory[]).map((name) => ({
  name,
  merchants: MERCHANTS_BY_CATEGORY[name],
  range: EXPENSE_RANGE_BY_CATEGORY[name],
}));

function generateTransactions(rng: () => number, now: Date): TxRow[] {
  const rows: TxRow[] = [];

  for (let i = 0; i < WINDOW_MONTHS; i++) {
    const { year, month } = windowMonth(now, i);

    // 용돈 — 매달 5일±1일, 40만원 고정
    rows.push({
      userId: DEMO_USER_ID,
      occurredAt: dateUTC(year, month, 5 + randInt(rng, -1, 1)),
      amount: 400_000,
      rawDesc: "엄마 용돈",
      counterparty: "엄마",
    });

    // 카페 알바 — 매달 10일±3일, 60~80만원, 계절성 반영, 창의 마지막 4개월은 중단
    if (i < CAFE_ACTIVE_COUNT) {
      const base = randInt(rng, 600, 800) * 1000;
      const factor =
        SEASONAL_FACTORS.salary.months[month as keyof typeof SEASONAL_FACTORS.salary.months] ??
        SEASONAL_FACTORS.salary.default;
      rows.push({
        userId: DEMO_USER_ID,
        occurredAt: dateUTC(year, month, 10 + randInt(rng, -3, 3)),
        amount: Math.round((base * factor) / 1000) * 1000,
        rawDesc: CAFE_DESC,
        counterparty: CAFE_COUNTERPARTY,
      });
    }

    // 과외 — 발생확률 0.6, 25~35만원
    if (rng() < 0.6) {
      rows.push({
        userId: DEMO_USER_ID,
        occurredAt: dateUTC(year, month, randInt(rng, 1, 28)),
        amount: randInt(rng, 25, 35) * 1000,
        rawDesc: "과외비",
        counterparty: "과외",
      });
    }

    // 장학금 — 3월·9월만 100만원 (실제 학기 캘린더에 맞춰 계산된 캘린더월 기준)
    if (month === 3 || month === 9) {
      rows.push({
        userId: DEMO_USER_ID,
        occurredAt: dateUTC(year, month, randInt(rng, 1, 28)),
        amount: 1_000_000,
        rawDesc: "국가장학재단 장학금",
        counterparty: "국가장학재단",
      });
    }

    // 캐시백 — 월 2~5건, 500~15,000원
    const cashbackCount = randInt(rng, 2, 5);
    for (let c = 0; c < cashbackCount; c++) {
      const source = pick(rng, CASHBACK_SOURCES);
      rows.push({
        userId: DEMO_USER_ID,
        occurredAt: dateUTC(year, month, randInt(rng, 1, 28)),
        amount: randInt(rng, 500, 15_000),
        rawDesc: source.desc,
        counterparty: source.counterparty,
      });
    }

    // 지출 — 식비/쇼핑/문화·여가/교육·자기계발/생필품·경조사/기타, 월 40~80건
    const expenseCount = randInt(rng, 40, 80);
    for (let e = 0; e < expenseCount; e++) {
      const category = pick(rng, EXPENSE_CATEGORIES);
      const merchant = pick(rng, category.merchants);
      const [min, max] = category.range;
      rows.push({
        userId: DEMO_USER_ID,
        occurredAt: dateUTC(year, month, randInt(rng, 1, 28)),
        amount: -randInt(rng, min, max) * 1000,
        rawDesc: `${merchant} 결제`,
        counterparty: merchant,
      });
    }
  }

  rows.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  return rows;
}

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(rows: TxRow[]): string {
  const outDir = path.resolve(import.meta.dirname, "output");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "dummy-transactions.csv");

  const header = "userId,occurredAt,amount,rawDesc,counterparty";
  const lines = rows.map((r) =>
    [r.userId, r.occurredAt.toISOString(), r.amount, csvField(r.rawDesc), csvField(r.counterparty)].join(","),
  );
  writeFileSync(outPath, [header, ...lines].join("\n") + "\n", "utf-8");
  return outPath;
}

async function seedDb(rows: TxRow[]): Promise<void> {
  // 거래를 통째로 갈아엎으므로, 옛 거래 id를 참조하던 분류 확정 기록도 함께 정리한다(FK 제약).
  await prisma.incomeEvent.deleteMany({ where: { transaction: { userId: DEMO_USER_ID } } });
  await prisma.transaction.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.transaction.createMany({ data: rows });
}

function printSummary(rows: TxRow[], now: Date): void {
  console.log(`\n총 ${rows.length}건 생성\n`);

  console.log("앞 10줄:");
  console.table(
    rows.slice(0, 10).map((r) => ({
      occurredAt: r.occurredAt.toISOString().slice(0, 10),
      amount: r.amount,
      rawDesc: r.rawDesc,
      counterparty: r.counterparty,
    })),
  );

  const monthly = Array.from({ length: WINDOW_MONTHS }, (_, i) => {
    const { year, month } = windowMonth(now, i);
    const monthRows = rows.filter(
      (r) => r.occurredAt.getUTCFullYear() === year && r.occurredAt.getUTCMonth() + 1 === month,
    );
    const totalIncome = monthRows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
    const cafeIncome = monthRows
      .filter((r) => r.counterparty === CAFE_COUNTERPARTY)
      .reduce((s, r) => s + r.amount, 0);
    return { 월: `${year}-${String(month).padStart(2, "0")}`, 전체입금합계: totalIncome, 카페알바수입: cafeIncome };
  });

  console.log(`\n월별 입금 합계 (마지막 ${WINDOW_MONTHS - CAFE_ACTIVE_COUNT}개월은 카페알바수입이 0이 되는지 확인):`);
  console.table(monthly);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const seed = args.seed ? Number(args.seed) : 42;
  console.log(`시드: ${seed}`);

  const now = new Date();
  const rng = mulberry32(seed);
  const rows = generateTransactions(rng, now);

  const csvPath = writeCsv(rows);
  console.log(`CSV 저장: ${csvPath}`);

  await seedDb(rows);
  console.log(`DB 시드 완료 (userId=${DEMO_USER_ID})`);

  printSummary(rows, now);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
