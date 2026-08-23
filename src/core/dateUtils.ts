/** "YYYY-MM" 월 키를 다루는 순수 함수들. backtest/forecast 대상월 계산에 쓰인다. */

/** lastDate가 속한 달을 기준으로, 그 이전 n개월(자신 포함)의 "YYYY-MM" 키를 오래된 순으로 반환한다. */
export function lastNMonthKeys(lastDate: Date, n: number): string[] {
  const year = lastDate.getUTCFullYear();
  const month = lastDate.getUTCMonth();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(year, month - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** "YYYY-MM" 키의 다음 달 키를 반환한다. */
export function nextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Date 객체를 "YYYY-MM" 키로 변환한다. */
export function toMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM" 키가 가리키는 달의 1일 00:00 UTC Date를 반환한다. */
export function monthStart(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}
