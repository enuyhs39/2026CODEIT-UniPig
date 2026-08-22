/**
 * 입금 거래를 분류(classify.ts) → 소득원별로 묶어서 프로파일링(profiling.ts)까지 마친 결과를 반환한다.
 * GET /api/sources, GET /api/forecast, POST /api/budget/draft가 공통으로 쓰는 조립 로직 —
 * 새 판단 로직 없이 기존 두 core 모듈을 이어붙이기만 한다(backtest.ts와 같은 성격).
 */

import { classifyIncomeTransactions, type IncomeCategory, type IncomeTransaction, type UserRule } from "./classify";
import { profileSource, type IncomeOccurrence, type SourceProfile } from "./profiling";

export type ProfiledSource = {
  sourceId: string;
  category: IncomeCategory;
  profile: SourceProfile;
};

export function buildProfiledSources(
  transactions: IncomeTransaction[],
  userRules: UserRule[],
  today: Date,
): ProfiledSource[] {
  const { events } = classifyIncomeTransactions(transactions, userRules);

  const amountByTxId = new Map(transactions.map((tx) => [tx.id, tx.amount]));
  const occurredAtByTxId = new Map(transactions.map((tx) => [tx.id, tx.occurredAt]));

  const bySource = new Map<string, { category: IncomeCategory; occurrences: IncomeOccurrence[] }>();
  for (const e of events) {
    const entry = bySource.get(e.sourceId) ?? { category: e.category, occurrences: [] };
    entry.occurrences.push({ occurredAt: occurredAtByTxId.get(e.txId)!, amount: amountByTxId.get(e.txId)! });
    bySource.set(e.sourceId, entry);
  }

  const result: ProfiledSource[] = [];
  for (const [sourceId, { category, occurrences }] of bySource) {
    const profile = profileSource(occurrences, today);
    if (!profile.profilable) continue;
    const { profilable: _profilable, ...rest } = profile;
    result.push({ sourceId, category, profile: rest });
  }
  return result;
}
