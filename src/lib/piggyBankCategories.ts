import type { PiggyBankCategory, PiggyBankItemStatus } from "@/generated/prisma/enums";
import type { PaletteColor } from "@/generated/prisma/enums";

export const PIGGYBANK_CATEGORIES: PiggyBankCategory[] = ["PARKING", "SAVINGS", "STOCK", "OTHER"];

export const PIGGYBANK_CATEGORY_LABEL: Record<PiggyBankCategory, string> = {
  PARKING: "파킹",
  SAVINGS: "적금",
  STOCK: "주식",
  OTHER: "기타",
};

export const PIGGYBANK_CATEGORY_COLOR: Record<PiggyBankCategory, PaletteColor> = {
  PARKING: "BLUE",
  SAVINGS: "GREEN",
  STOCK: "YELLOW",
  OTHER: "GRAY",
};

export const PIGGYBANK_STATUSES: PiggyBankItemStatus[] = ["PENDING", "IN_PROGRESS", "DONE"];

export const PIGGYBANK_STATUS_LABEL: Record<PiggyBankItemStatus, string> = {
  PENDING: "시작 전",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
};
