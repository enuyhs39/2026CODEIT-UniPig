import { buildProfiledSources } from "@/core/sourcePipeline";
import { forecastIncome, type ForecastSourceInput } from "@/core/forecast";
import { hashSeed } from "@/core/stats";
import { toMonthKey } from "@/core/dateUtils";
import type { IncomeCategory } from "@/core/classify";
import { OVERDUE_ALERT_CATEGORIES } from "@/config";
import { loadIncomeTransactionsAndRules, loadTerminatedSourceIds } from "@/lib/incomeData";
import { getConfirmedBudgetProgress } from "@/lib/confirmedBudget";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { SourceStatusBadge } from "@/components/SourceStatusBadge";
import { BudgetPlanner } from "@/components/BudgetPlanner";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { formatWon, formatWonThousand } from "@/lib/format";

const CATEGORY_LABEL: Record<IncomeCategory, string> = {
  allowance: "용돈",
  salary: "알바/급여",
  scholarship: "장학금",
  cashback: "캐시백",
  irregular: "불규칙",
};
const CATEGORY_ORDER: IncomeCategory[] = ["allowance", "salary", "scholarship", "cashback", "irregular"];

/** sourceId는 "가맹점명:category" 형태의 내부 그룹 키(classify.ts) — 화면엔 가맹점명만 보여준다. */
function displaySourceName(sourceId: string): string {
  return sourceId.split(":")[0];
}

export default async function Home() {
  const userId = await requireUserId();

  // UserPreference row 존재 여부 = 온보딩 완료 여부(§3b) — 온보딩(POST /api/onboarding)이 끝나야만 생긴다.
  const preference = await prisma.userPreference.findUnique({ where: { userId } });

  return (
    <div className="flex flex-1 flex-col bg-ice px-6 py-8">
      {!preference ? <OnboardingWizard /> : <BudgetContent userId={userId} />}
    </div>
  );
}

async function BudgetContent({ userId }: { userId: string }) {
  const [{ transactions, userRules }, terminatedSourceIds] = await Promise.all([
    loadIncomeTransactionsAndRules(userId),
    loadTerminatedSourceIds(userId),
  ]);
  const sources = buildProfiledSources(transactions, userRules, new Date(), terminatedSourceIds)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  // 예산 화면은 항상 "이번 달" 기준 — 이번 달에 이미 확정한 예산이 있으면 진행률을 보여주고,
  // 없으면 이번 달 예산을 새로 짠다.
  const targetMonth = toMonthKey(new Date());
  const targetMonthNum = Number(targetMonth.split("-")[1]);
  const forecastSources: ForecastSourceInput[] = sources.map((s) => ({
    category: s.category,
    occurrenceProb: s.profile.occurrenceProb,
    survivalProb: s.profile.survivalProb,
    amountMu: s.profile.amountMu,
    amountSigma: s.profile.amountSigma,
  }));
  const seed = hashSeed(`${userId}:${targetMonth}`);
  const forecast = forecastIncome(forecastSources, targetMonth, seed);

  const confirmedProgress = await getConfirmedBudgetProgress(userId, targetMonth);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-navy">{targetMonthNum}월 예상 수입</h2>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-navy/50">예상 수입 범위</p>
          <p className="mt-2 text-2xl font-black leading-snug text-navy">
            {formatWonThousand(forecast.percentiles.p10)} ~ {formatWonThousand(forecast.percentiles.p90)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-navy/70">
            예산안 속 예상 수입은 <strong className="font-extrabold text-navy">{formatWonThousand(forecast.percentiles.p25)}</strong>으로
            안전하게 잡았어요.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-navy">{targetMonthNum}월 맞춤 예산안</h2>
        <BudgetPlanner targetMonth={targetMonth} confirmedProgress={confirmedProgress} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-navy">수입 목록</h2>

        {sources.length === 0 && (
          <p className="text-sm text-navy/60">아직 프로파일링된 소득원이 없어요.</p>
        )}
        {sources.map((s) => (
          <div key={s.sourceId} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-extrabold text-navy">{displaySourceName(s.sourceId)}</p>
                <p className="text-sm text-navy/60">{CATEGORY_LABEL[s.category]}</p>
              </div>
              {!s.profile.alive && OVERDUE_ALERT_CATEGORIES.includes(s.category) && (
                <SourceStatusBadge
                  sourceId={s.sourceId}
                  categoryLabel={CATEGORY_LABEL[s.category]}
                  periodDays={s.profile.periodDays}
                  elapsedDays={s.profile.elapsedDays}
                />
              )}
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-navy/50">주기</dt>
                <dd className="font-medium text-navy">{Math.round(s.profile.periodDays)}일</dd>
              </div>
              <div>
                <dt className="text-navy/50">평균 금액</dt>
                <dd className="font-medium text-navy">{formatWon(s.profile.amountMu)}</dd>
              </div>
              <div>
                <dt className="text-navy/50">마지막 입금</dt>
                <dd className="font-medium text-navy">{s.profile.lastSeen.toISOString().slice(0, 10)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </section>
    </div>
  );
}
