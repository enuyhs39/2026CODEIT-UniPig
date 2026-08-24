import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { cn } from "@/lib/utils";

const DEFAULT_NICKNAME = "피그";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default async function HomePage() {
  const userId = await requireUserId();
  const preference = await prisma.userPreference.findUnique({ where: { userId } });
  const nickname = preference?.nickname || DEFAULT_NICKNAME;

  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐷</span>
          <h1 className="text-[17px] font-bold">유니피그({nickname})</h1>
        </div>
        <button
          type="button"
          className="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          새로 만들기
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
        <div className="border-b border-card-border px-4 py-2.5 text-[12px] font-semibold text-muted-foreground">
          {year}년
        </div>
        <ul>
          {MONTHS.map((month) => {
            const isCurrent = month === currentMonth;
            return (
              <li key={month} className="border-b border-card-border last:border-b-0">
                <Link
                  href={`/transactions?month=${month}`}
                  className="flex items-center gap-3 px-4 py-3 text-[13.5px] transition-colors hover:bg-accent-soft"
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", isCurrent ? "bg-danger" : "bg-track")} />
                  <span className={cn(isCurrent ? "font-bold text-danger" : "font-medium text-foreground")}>
                    {month}월
                  </span>
                  {isCurrent && (
                    <span className="ml-auto rounded-full bg-danger/10 px-2 py-0.5 text-[10.5px] font-semibold text-danger">
                      이번 달
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
