import { toMonthKey } from "@/core/dateUtils";
import { getConfirmedBudgetProgress } from "@/lib/confirmedBudget";
import { requireUserId } from "@/lib/session";
import { PurchaseSimulator } from "@/components/PurchaseSimulator";

export default async function SimulationPage() {
  const userId = await requireUserId();
  const targetMonth = toMonthKey(new Date());
  const progress = await getConfirmedBudgetProgress(userId, targetMonth);

  if (!progress) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-card-border px-5 py-12 text-center text-muted-foreground">
        <h1 className="text-sm font-bold text-foreground">구매 시뮬레이션</h1>
        <p className="text-[12.5px]">
          이번 달 확정된 예산이 없어서 시뮬레이션할 수 없어요. AI피그에서 예산을 먼저 확정해주세요.
        </p>
      </div>
    );
  }

  return <PurchaseSimulator progress={progress} />;
}
