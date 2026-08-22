import { buildProfiledSources } from "@/core/sourcePipeline";
import type { IncomeCategory } from "@/core/classify";
import { OVERDUE_ALERT_CATEGORIES } from "@/config";
import { loadIncomeTransactionsAndRules, loadTerminatedSourceIds } from "@/lib/incomeData";
import { OverdueAlertCard } from "@/components/OverdueAlertCard";

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

  return (
    <div className="flex flex-col flex-1">
      <header className="bg-navy px-6 py-5 text-white">
        <h1 className="text-lg font-semibold">UniPig · 수입 구조</h1>
      </header>

      <main className="flex-1 bg-ice px-6 py-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {overdueSources.length > 0 && (
            <section className="flex flex-col gap-3">
              {overdueSources.map((s) => (
                <OverdueAlertCard
                  key={s.sourceId}
                  sourceId={s.sourceId}
                  categoryLabel={CATEGORY_LABEL[s.category]}
                  periodDays={s.profile.periodDays}
                  elapsedDays={s.profile.elapsedDays}
                />
              ))}
            </section>
          )}

          <section className="flex flex-col gap-3">
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
                    <dd className="text-navy">{Math.round(s.profile.amountMu).toLocaleString("ko-KR")}원</dd>
                  </div>
                  <div>
                    <dt className="text-navy/50">마지막 입금</dt>
                    <dd className="text-navy">{s.profile.lastSeen.toISOString().slice(0, 10)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
