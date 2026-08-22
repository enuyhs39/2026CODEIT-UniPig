import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/config";
import { calculateMonthlySummary } from "@/core/monthlySummary";
import { cn } from "@/lib/utils";

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "시작 전",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
};

export default async function HomePage() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [monthTransactions, savingsGoals] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: DEMO_USER_ID, occurredAt: { gte: monthStart, lt: monthEnd } },
      select: { amount: true },
    }),
    prisma.savingsGoal.findMany({
      where: { userId: DEMO_USER_ID },
      orderBy: { targetDate: "asc" },
    }),
  ]);

  const summary = calculateMonthlySummary(monthTransactions);
  const monthLabel = `${now.getUTCMonth() + 1}월`;

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-card-border pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold">{monthLabel}</span>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
            진행 중
          </span>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="mb-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              이번 달 수입
            </p>
            <p className="font-mono text-[15px] font-bold">{formatWon(summary.totalIncome)}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              남은 금액
            </p>
            <p className="font-mono text-[15px] font-bold text-gold">{formatWon(summary.remaining)}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-bold">저축 목표</h2>
        <div className="mt-2.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {savingsGoals.map((goal) => {
            const pct =
              goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                : 0;
            return (
              <div
                key={goal.id}
                className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{goal.title}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      goal.status === "PENDING"
                        ? "bg-track text-muted-foreground"
                        : "bg-accent-soft text-accent",
                    )}
                  >
                    {STATUS_LABEL[goal.status]}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-track">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between font-mono text-[12.5px]">
                  <span className="font-bold">{formatWon(goal.currentAmount)}</span>
                  <span className="font-bold text-accent">{pct}%</span>
                  <span className="text-muted-foreground">{formatWon(goal.targetAmount)}</span>
                </div>
              </div>
            );
          })}
          {savingsGoals.length === 0 && (
            <p className="py-2 text-[13px] text-muted-foreground">저축 목표가 아직 없어요</p>
          )}
        </div>
      </section>
    </div>
  );
}
