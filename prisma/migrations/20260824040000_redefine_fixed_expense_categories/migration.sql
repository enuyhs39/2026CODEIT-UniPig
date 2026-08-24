-- FixedExpenseCategory 카테고리 재정의: TRANSPORT/RENT/PHONE/SUBSCRIPTION -> TRANSPORT/SUBSCRIPTION/UTILITIES/OTHER.
-- RENT는 별도 카테고리에서 사라지고 OTHER로, PHONE은 UTILITIES(관리·통신비)로 흡수한다.
-- Postgres는 enum 값을 직접 삭제할 수 없으므로 새 enum 타입을 만들어 컬럼을 교체하는 방식으로 처리한다.
BEGIN;

CREATE TYPE "FixedExpenseCategory_new" AS ENUM ('TRANSPORT', 'SUBSCRIPTION', 'UTILITIES', 'OTHER');

ALTER TABLE "fixed_expenses"
  ALTER COLUMN "category" TYPE "FixedExpenseCategory_new"
  USING (
    (CASE "category"::text
      WHEN 'RENT' THEN 'OTHER'
      WHEN 'PHONE' THEN 'UTILITIES'
      ELSE "category"::text
    END)::"FixedExpenseCategory_new"
  );

ALTER TYPE "FixedExpenseCategory" RENAME TO "FixedExpenseCategory_old";
ALTER TYPE "FixedExpenseCategory_new" RENAME TO "FixedExpenseCategory";
DROP TYPE "FixedExpenseCategory_old";

COMMIT;
