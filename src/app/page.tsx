import { buildProfiledSources } from "@/core/sourcePipeline";
import { forecastIncome, type ForecastSourceInput } from "@/core/forecast";
import { hashSeed } from "@/core/stats";
import { nextMonthKey, toMonthKey } from "@/core/dateUtils";
import type { IncomeCategory } from "@/core/classify";
import { DEMO_USER_ID, OVERDUE_ALERT_CATEGORIES } from "@/config";
import { loadIncomeTransactionsAndRules, loadTerminatedSourceIds } from "@/lib/incomeData";
import { OverdueAlertCard } from "@/components/OverdueAlertCard";
import { ForecastChart } from "@/components/ForecastChart";
import { formatWon } from "@/lib/format";

const CATEGORY_LABEL: Record<IncomeCategory, string> = {
  allowance: "용돈",
  salary: "알바/급여",
  scholarship: "장학금",
  cashback: "캐시백",
  irregular: "불규칙",
};

function survivalBadge(alive: boolean) {
  return alive ? (
    <span className="rounded-full bg-cobalt/30 px-2.5 py-0.5 text-xs font-medium text-navy">생존 중</span>
  ) : (
    <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy/60">종료 추정</span>
  );
}

export default async function Home() {
  const [{ transactions, userRules }, terminatedSourceIds] = await Promise.all([
    loadIncomeTransactionsAndRules(),
    loadTerminatedSourceIds(),
  ]);
  const sources = buildProfiledSources(transactions, userRules, new Date(), terminatedSourceIds);

  const overdueSources = sources.filter(
    (s) => s.profile.isOverdue && OVERDUE_ALERT_CATEGORIES.includes(s.category),
  );

  // 예측은 항상 "다음 달" 기준 — 이번 달 예산을 짜는 시점엔 다음 달 수입이 궁금하니까.
  const targetMonth = nextMonthKey(toMonthKey(new Date()));
  const forecastSources: ForecastSourceInput[] = sources.map((s) => ({
    category: s.category,
    occurrenceProb: s.profile.occurrenceProb,
    survivalProb: s.profile.survivalProb,
    amountMu: s.profile.amountMu,
    amountSigma: s.profile.amountSigma,
  }));
  const seed = hashSeed(`${DEMO_USER_ID}:${targetMonth}`);
  const forecast = forecastIncome(forecastSources, targetMonth, seed);

  return (
    <div className="flex flex-col flex-1">
      <header className="bg-navy px-6 py-5 text-white">
        <h1 className="text-lg font-semibold">UniPig</h1>
      </header>

      <main className="flex-1 bg-ice px-6 py-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-10">
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-navy">수입 구조</h2>

            {overdueSources.map((s) => (
              <OverdueAlertCard
                key={s.sourceId}
                sourceId={s.sourceId}
                categoryLabel={CATEGORY_LABEL[s.category]}
                periodDays={s.profile.periodDays}
                elapsedDays={s.profile.elapsedDays}
              />
            ))}

            {sources.length === 0 && (
              <p className="text-sm text-navy/60">아직 프로파일링된 소득원이 없어요.</p>
            )}
            {sources.map((s) => (
              <div key={s.sourceId} className="rounded-lg border border-navy/10 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-navy">{s.sourceId}</p>
                    <p className="text-sm text-navy/60">{CATEGORY_LABEL[s.category]}</p>
                  </div>
                  {survivalBadge(s.profile.alive)}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-navy/50">주기</dt>
                    <dd className="text-navy">{Math.round(s.profile.periodDays)}일</dd>
                  </div>
                  <div>
                    <dt className="text-navy/50">평균 금액</dt>
                    <dd className="text-navy">{formatWon(s.profile.amountMu)}</dd>
                  </div>
                  <div>
                    <dt className="text-navy/50">마지막 입금</dt>
                    <dd className="text-navy">{s.profile.lastSeen.toISOString().slice(0, 10)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-navy">예측 · {targetMonth}</h2>

            <div className="rounded-lg border border-navy/10 bg-white p-4">
              <p className="text-sm leading-relaxed text-navy">
                다음 달 예상 수입 범위는 <strong>{formatWon(forecast.percentiles.p10)}</strong> ~{" "}
                <strong>{formatWon(forecast.percentiles.p90)}</strong>이에요. 기준선{" "}
                <strong>{formatWon(forecast.percentiles.p25)}</strong>으로 안전하게 잡았어요.
              </p>
              <ForecastChart forecast={forecast} />
              <p className="text-xs text-navy/50">
                점선은 P25(기준선)·P50(중앙값), 음영 구간은 P10~P90 범위예요.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
