/**
 * Transaction CSV(generateDummy.ts가 쓰는 것과 같은 포맷: userId,occurredAt,amount,rawDesc,counterparty)를
 * 파싱한다. DB/Next.js 의존 없는 순수 함수 — POST /api/upload가 이걸 호출해서 파싱만 하고 저장은 직접 한다.
 * userId 컬럼은 무시한다 — 인증이 없어 업로드하는 사람은 항상 DEMO_USER_ID로 고정되기 때문.
 */

export type TransactionCsvRow = {
  occurredAt: Date;
  amount: number;
  rawDesc: string;
  counterparty: string;
};

const REQUIRED_COLUMNS = ["occurredAt", "amount", "rawDesc", "counterparty"] as const;

/** 따옴표로 감싸진 필드 안의 쉼표/개행/이스케이프된 따옴표("")까지 처리하는 상태기반 CSV 셀 분리기. */
function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && csv[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function parseTransactionCsv(csv: string): TransactionCsvRow[] {
  const rows = parseCsvRows(csv);
  if (rows.length === 0) return [];

  const header = rows[0];
  const columnIndex: Record<string, number> = {};
  for (const name of REQUIRED_COLUMNS) {
    const i = header.indexOf(name);
    if (i === -1) {
      throw new Error(`parseTransactionCsv: 헤더에 "${name}" 컬럼이 없습니다`);
    }
    columnIndex[name] = i;
  }

  return rows.slice(1).map((cols) => ({
    occurredAt: new Date(cols[columnIndex.occurredAt]),
    amount: Number(cols[columnIndex.amount]),
    rawDesc: cols[columnIndex.rawDesc],
    counterparty: cols[columnIndex.counterparty],
  }));
}
