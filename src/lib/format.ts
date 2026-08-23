export function formatWon(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

/** 천 원 단위로 반올림해서 표시한다(예측 수입 범위처럼 정확한 원 단위가 중요하지 않은 화면용). */
export function formatWonThousand(amount: number): string {
  const rounded = Math.round(amount / 1_000) * 1_000; // 1000원 단위 반올림
  return formatWon(rounded); // "152,000원" 형태로 표시
}