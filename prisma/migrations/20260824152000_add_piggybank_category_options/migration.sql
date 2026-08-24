CREATE TABLE "piggybank_category_options" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" "PaletteColor" NOT NULL DEFAULT 'DEFAULT',
    "group" "PiggyBankCategory" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "piggybank_category_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "piggybank_category_options_user_id_label_key"
ON "piggybank_category_options"("user_id", "label");

ALTER TABLE "piggybank_items"
ADD COLUMN "category_option_id" TEXT;

ALTER TABLE "piggybank_items"
ADD CONSTRAINT "piggybank_items_category_option_id_fkey"
FOREIGN KEY ("category_option_id") REFERENCES "piggybank_category_options"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "piggybank_category_options" ("id", "user_id", "label", "color", "group", "sort_order")
SELECT
    'pbc_' || substr(md5("user_id" || ':' || "category"::text), 1, 24),
    "user_id",
    CASE "category"
        WHEN 'PARKING' THEN '파킹'
        WHEN 'SAVINGS' THEN '적금'
        WHEN 'STOCK' THEN '주식'
        ELSE '기타'
    END,
    CASE "category"
        WHEN 'PARKING' THEN 'BLUE'::"PaletteColor"
        WHEN 'SAVINGS' THEN 'GREEN'::"PaletteColor"
        WHEN 'STOCK' THEN 'YELLOW'::"PaletteColor"
        ELSE 'GRAY'::"PaletteColor"
    END,
    "category",
    CASE "category"
        WHEN 'PARKING' THEN 0
        WHEN 'SAVINGS' THEN 1
        WHEN 'STOCK' THEN 2
        ELSE 3
    END
FROM "piggybank_items"
GROUP BY "user_id", "category";

UPDATE "piggybank_items" AS item
SET "category_option_id" = option."id"
FROM "piggybank_category_options" AS option
WHERE option."user_id" = item."user_id"
  AND option."group" = item."category";
