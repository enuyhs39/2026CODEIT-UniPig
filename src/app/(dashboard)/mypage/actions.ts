"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { DEFAULT_SAVING_RATE } from "@/config";
import { PALETTE_COLORS } from "@/lib/categoryColors";
import { EXPENSE_GROUPS, INCOME_GROUPS } from "@/lib/aiCategoryGroups";
import { PIGGYBANK_CATEGORIES } from "@/lib/piggyBankCategories";
import type {
  ExpenseCategory,
  IncomeCategory,
  LedgerEntryType,
  PaletteColor,
  PiggyBankCategory,
} from "@/generated/prisma/enums";

const MAX_NICKNAME_LENGTH = 20;
const MAX_CATEGORY_LABEL_LENGTH = 20;

export async function updateNickname(formData: FormData) {
  const userId = await requireUserId();
  const nickname = String(formData.get("nickname") ?? "").trim().slice(0, MAX_NICKNAME_LENGTH);
  if (!nickname) return;

  await prisma.userPreference.upsert({
    where: { userId },
    update: { nickname },
    create: { userId, nickname, weights: {}, savingRate: DEFAULT_SAVING_RATE },
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
  const userId = await requireUserId();
  const label = String(formData.get("label") ?? "").trim().slice(0, MAX_CATEGORY_LABEL_LENGTH);
  const color = parseColor(formData.get("color"));
  const resolved = resolveAiGroup(formData.get("aiGroup"));
  if (!label || !resolved) return;

  const count = await prisma.ledgerCategory.count({ where: { userId } });

  try {
    await prisma.ledgerCategory.create({
      data: { userId, label, color, ...resolved, sortOrder: count },
    });
  } catch {
    return;
  }

  revalidatePath("/mypage");
  revalidatePath("/transactions");
}

export async function updateLedgerCategory(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, MAX_CATEGORY_LABEL_LENGTH);
  const color = parseColor(formData.get("color"));
  const resolved = resolveAiGroup(formData.get("aiGroup"));
  if (!id || !label || !resolved) return;

  try {
    await prisma.ledgerCategory.updateMany({
      where: { id, userId },
      data: { label, color, ...resolved },
    });
  } catch {
    return;
  }

  revalidatePath("/mypage");
  revalidatePath("/transactions");
}

export async function deleteLedgerCategory(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await prisma.ledgerCategory.deleteMany({ where: { id, userId } });
  } catch {
    // 이 구분을 사용 중인 지출/수입 항목이 있으면 삭제하지 않는다.
    return;
  }

  revalidatePath("/mypage");
  revalidatePath("/transactions");
}

function parsePiggyBankGroup(value: FormDataEntryValue | null): PiggyBankCategory | null {
  const group = String(value ?? "");
  return (PIGGYBANK_CATEGORIES as string[]).includes(group) ? (group as PiggyBankCategory) : null;
}

export async function createPiggyBankCategory(formData: FormData) {
  const userId = await requireUserId();
  const label = String(formData.get("label") ?? "").trim().slice(0, MAX_CATEGORY_LABEL_LENGTH);
  const color = parseColor(formData.get("color"));
  const group = parsePiggyBankGroup(formData.get("fixedGroup"));
  if (!label || !group) return;

  const count = await prisma.piggyBankCategoryOption.count({ where: { userId } });
  try {
    await prisma.piggyBankCategoryOption.create({
      data: { userId, label, color, group, sortOrder: count },
    });
  } catch {
    return;
  }

  revalidatePath("/mypage");
  revalidatePath("/piggybank");
}

export async function updatePiggyBankCategory(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, MAX_CATEGORY_LABEL_LENGTH);
  const color = parseColor(formData.get("color"));
  const group = parsePiggyBankGroup(formData.get("fixedGroup"));
  if (!id || !label || !group) return;

  try {
    await prisma.piggyBankCategoryOption.updateMany({
      where: { id, userId },
      data: { label, color, group },
    });
  } catch {
    return;
  }

  revalidatePath("/mypage");
  revalidatePath("/piggybank");
}

export async function deletePiggyBankCategory(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.piggyBankCategoryOption.deleteMany({ where: { id, userId } });
  revalidatePath("/mypage");
  revalidatePath("/piggybank");
}
