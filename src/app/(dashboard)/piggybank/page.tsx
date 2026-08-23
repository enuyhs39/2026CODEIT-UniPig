type PiggyBankTag = "적금" | "예금" | "주식" | "파킹";

interface PiggyBankItem {
  id: string;
  emoji: string;
  title: string;
  tag?: PiggyBankTag;
  targetAmount: number;
  currentAmount: number;
  startDate?: string;
  endDate?: string;
}

const PIGGY_BANKS: PiggyBankItem[] = [
  {
    id: "1",
    emoji: "🎓",
    title: "졸업여행 적금",
    tag: "적금",
    targetAmount: 500000,
    currentAmount: 315000,
    startDate: "2026-03-01",
    endDate: "2026-08-31",
  },
  {
    id: "2",
    emoji: "📈",
    title: "국내 ETF",
    tag: "주식",
    targetAmount: 1000000,
    currentAmount: 240000,
    endDate: "2026-11-30",
  },
  {
    id: "3",
    emoji: "🎉",
    title: "취업 준비 적금",
    tag: "적금",
    targetAmount: 8000000,
    currentAmount: 0,
    startDate: "2026-09-01",
    endDate: "2028-09-30",
  },
  {
    id: "4",
    emoji: "🚌",
    title: "교통비 저금통",
    tag: "파킹",
    targetAmount: 600000,
    currentAmount: 240000,
  },
];

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatDate(date?: string): string | null {
  if (!date) return null;
  const d = new Date(date);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function PiggyBankPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-bold">저금통</h1>
        <button
          type="button"
          className="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          새로 만들기
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {PIGGY_BANKS.map((item) => {
          const pct =
            item.targetAmount > 0
              ? Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100))
              : 0;
          const startLabel = formatDate(item.startDate);
          const endLabel = formatDate(item.endDate);
          const dateRange = startLabel && endLabel ? `${startLabel} → ${endLabel}` : endLabel;

          return (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.emoji}</span>
                <span className="text-sm font-bold">{item.title}</span>
              </div>

              {item.tag && (
                <span className="w-fit rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-semibold text-gold">
                  {item.tag}
                </span>
              )}

              <span className="font-mono text-[15px] font-bold">{formatWon(item.targetAmount)}</span>

              <div className="flex items-center gap-2.5">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-track">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-[12px] font-bold text-accent">{pct}%</span>
              </div>

              <span className="font-mono text-[12.5px] text-muted-foreground">
                {formatWon(item.currentAmount)}
              </span>

              {dateRange && <span className="text-[11.5px] text-muted-foreground">{dateRange}</span>}
            </div>
          );
        })}

        <button
          type="button"
          className="flex min-h-[180px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-card-border text-[13px] font-semibold text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <span className="text-xl">+</span>
          <span>새 페이지</span>
        </button>
      </div>
    </div>
  );
}
