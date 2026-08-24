-- 마이페이지의 지출 분류를 예산관리와 동일한 6개 항목으로 통일한다.
-- 기존 카페는 식비로, 교통은 생필품/경조사로 이전한다.
BEGIN;

CREATE TYPE "ExpenseCategory_new" AS ENUM (
  'FOOD',
  'SHOPPING',
  'CULTURE',
  'EDUCATION',
  'NECESSITIES',
  'OTHER'
);

ALTER TABLE "ledger_categories"
  ALTER COLUMN "expense_group" TYPE "ExpenseCategory_new"
  USING (
    (CASE "expense_group"::text
      WHEN 'FOOD' THEN 'FOOD'
      WHEN 'CAFE' THEN 'FOOD'
      WHEN 'SHOPPING' THEN 'SHOPPING'
      WHEN 'TRANSPORT' THEN 'NECESSITIES'
      WHEN 'OTHER' THEN 'OTHER'
      ELSE NULL
    END)::"ExpenseCategory_new"
  );

ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old";
ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";
DROP TYPE "ExpenseCategory_old";

COMMIT;
