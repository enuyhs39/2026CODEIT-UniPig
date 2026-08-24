"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from "recharts";
import {
  buildTransactionChart,
  type TransactionChartEntry,
  type TransactionChartStatus,
} from "@/lib/transactionChart";

type Category = {
  id: string;
  label: string;
  color: string;
};

type Props = {
  categories: Category[];
  entries: TransactionChartEntry[];
  rangeLabel: string;
  status: TransactionChartStatus;
  type: "expense" | "income";
};

const BLUE_COLORS = ["#739be0", "#88aae4", "#9db9e8", "#b1c8ed", "#c5d6f0", "#d3e0f3", "#dee8f6", "#e7eef8", "#eef3fa", "#f4f7fc"];
const RED_COLORS = ["#d2796b", "#dc8d81", "#e3a096", "#e9b3aa", "#eec5bf", "#f2d2cd", "#f5ddd9", "#f7e5e2", "#f9ecea", "#fbf2f0"];

const TYPE_STATUS_COLORS: Record<Props["type"], Record<TransactionChartStatus, string[]>> = {
  expense: { pending: RED_COLORS, done: BLUE_COLORS },
  income: { pending: BLUE_COLORS, done: RED_COLORS },
};

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatCompactWon(amount: number): string {
  if (amount < 10_000) return formatWon(amount);
  const manWon = amount / 10_000;
  return `₩${Number.isInteger(manWon) ? manWon : manWon.toFixed(1)}만`;
}

function ChartLabel(props: PieLabelRenderProps) {
  const payload = props.payload as { label?: string; amount?: number; percentage?: number } | undefined;
  const x = Number(props.x);
  const smallSliceOffset = (payload?.percentage ?? 0) < 3 ? (props.index % 2 === 0 ? -8 : 8) : 0;
  const y = Number(props.y) + smallSliceOffset;
  const cx = Number(props.cx);
  if (!payload?.label || !Number.isFinite(x) || !Number.isFinite(y)) return null;

  return (
    <text
      x={x}
      y={y}
      fill="var(--muted-foreground)"
      fontSize="10"
      fontFamily="Pretendard, sans-serif"
      fontWeight="400"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {payload.label} {formatCompactWon(payload.amount ?? 0)} ({(payload.percentage ?? 0).toFixed(1)}%)
    </text>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function TransactionDonutChart({ categories, entries, rangeLabel, status, type }: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set(categories.map((category) => category.id)));
  const { slices, total } = useMemo(
    () => buildTransactionChart(entries, selectedIds, status),
    [entries, selectedIds, status],
  );

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === categories.length;
  const colors = TYPE_STATUS_COLORS[type][status];
  const typeLabel = type === "expense" ? "지출" : "수입";

  function toggleCategory(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(categories.map((category) => category.id)));
  }

  return (
    <section className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-extrabold">{typeLabel} 현황</h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{rangeLabel} · 체크박스 기준</p>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-2.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <FilterIcon />
            구분 {selectedCount}/{categories.length}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-card-border bg-card p-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-card-border pb-2">
                <p className="text-[12px] font-bold">원그래프에 포함할 구분</p>
                <button type="button" onClick={toggleAll} className="text-[10.5px] font-semibold text-accent">
                  {allSelected ? "전체 해제" : "전체 선택"}
                </button>
              </div>
              <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                {categories.map((category, index) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-[12px] hover:bg-accent-soft"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="truncate">{category.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 border-t border-card-border pt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                분석에서 뺄 {typeLabel} 구분은 체크를 해제하세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {slices.length > 0 ? (
        <div className="mt-2">
          <div className="relative h-[360px] min-w-0 sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="amount"
                  nameKey="label"
                  cx="50%"
                  cy="48%"
                  innerRadius={82}
                  outerRadius={112}
                  paddingAngle={0}
                  stroke="var(--card)"
                  strokeWidth={1.5}
                  label={ChartLabel}
                  labelLine={{ stroke: "var(--card-border)", strokeWidth: 1 }}
                >
                  {slices.map((slice, index) => (
                    <Cell
                      key={slice.categoryId}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatWon(Number(value))}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 top-[48%] flex -translate-y-1/2 flex-col items-center justify-center">
              <strong
                className="max-w-52 truncate text-[34px] font-semibold leading-none tracking-[-0.035em] tabular-nums"
                style={{ fontFamily: "Pretendard, sans-serif" }}
              >
                {formatCompactWon(total)}
              </strong>
              <span className="mt-2 text-[11px] text-muted-foreground">합계 금액</span>
            </div>
          </div>

          <div className="-mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 px-2 pb-2">
            {slices.map((slice, index) => (
              <div key={slice.categoryId} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span>{slice.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex h-52 flex-col items-center justify-center rounded-xl bg-background text-center">
          <p className="text-[13px] font-bold">표시할 {status === "done" ? "완료" : "예정"} {typeLabel}이 없어요</p>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            구분 필터를 확인하거나 아래 내역의 완료 체크를 바꿔보세요.
          </p>
        </div>
      )}
    </section>
  );
}
