"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID, DEFAULT_SAVING_RATE } from "@/config";
import { PALETTE_COLORS } from "@/lib/categoryColors";
import { EXPENSE_GROUPS, INCOME_GROUPS } from "@/lib/aiCategoryGroups";
import type { ExpenseCategory, IncomeCategory, LedgerEntryType, PaletteColor } from "@/generated/prisma/enums";

const MAX_NICKNAME_LENGTH = 20;
const MAX_CATEGORY_LABEL_LENGTH = 20;

export async function updateNickname(formData: FormData) {
  const nickname = String(formData.get("nickname") ?? "").trim().slice(0, MAX_NICKNAME_LENGTH);
  if (!nickname) return;

  await prisma.userPreference.upsert({
    where: { userId: DEMO_USER_ID },
    update: { nickname },
    create: { userId: DEMO_USER_ID, nickname, weights: {}, savingRate: DEFAULT_SAVING_RATE },
  });

  revalidatePath("/mypage");
  revalidatePath("/");
}

function parseColor(value: FormDataEntryValue | null): PaletteColor {
  const color = String(value ?? "DEFAULT");
  return (PALETTE_COLORS as string[]).includes(color) ? (color as PaletteColor) : "DEFAULT";
}

/** aiGroup 값이 지출 그룹인지 수입 그룹인지로 type을 역산하고, expenseGroup/incomeGroup 중 하나만 채운다. */
function resolveAiGroup(value: FormDataEntryValue | null) {
  const raw = String(value ?? "");
  if ((EXPENSE_GROUPS as string[]).includes(raw)) {
    return { type: "EXPENSE" as LedgerEntryType, expenseGroup: raw as ExpenseCategory, incomeGroup: null };
  }
  if ((INCOME_GROUPS as string[]).includes(raw)) {
    return { type: "INCOME" as LedgerEntryType, expenseGroup: null, incomeGroup: raw as IncomeCategory };
  }
  return null;
}

export async function createLedgerCategory(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim().slice(0, MAX_CATEGORY_LABEL_LENGTH);
  const color = parseColor(formData.get("color"));
  const resolved = resolveAiGroup(formData.get("aiGroup"));
  if (!label || !resolved) return;

  const count = await prisma.ledgerCategory.count({ where: { userId: DEMO_USER_ID } });

  try {
    await prisma.ledgerCategory.create({
      data: { userId: DEMO_USER_ID, label, color, ...resolved, sortOrder: count },
    });
  } catch {
    return;
  }

  revalidatePath("/mypage");
  revalidatePath("/transactions");
}

export async function updateLedgerCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, MAX_CATEGORY_LABEL_LENGTH);
  const color = parseColor(formData.get("color"));
  const resolved = resolveAiGroup(formData.get("aiGroup"));
  if (!id || !label || !resolved) return;

  try {
    await prisma.ledgerCategory.updateMany({
      where: { id, userId: DEMO_USER_ID },
      data: { label, color, ...resolved },
    });
  } catch {
    return;
  }

  revalidatePath("/mypage");
  revalidatePath("/transactions");
}

export async function deleteLedgerCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await prisma.ledgerCategory.deleteMany({ where: { id, userId: DEMO_USER_ID } });
  } catch {
    // 이 구분을 사용 중인 지출/수입 항목이 있으면 삭제하지 않는다.
    return;
  }

  revalidatePath("/mypage");
  revalidatePath("/transactions");
}
