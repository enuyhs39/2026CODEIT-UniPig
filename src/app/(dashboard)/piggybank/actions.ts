"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PIGGYBANK_STATUSES } from "@/lib/piggyBankCategories";
import type { PiggyBankItemStatus } from "@/generated/prisma/enums";

function parseStatus(value: FormDataEntryValue | null): PiggyBankItemStatus {
  const status = String(value ?? "PENDING");
  return (PIGGYBANK_STATUSES as string[]).includes(status) ? (status as PiggyBankItemStatus) : "PENDING";
}

function parseDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "");
  return raw ? new Date(raw) : null;
}

export async function createPiggyBankItem(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const targetAmount = Number(formData.get("targetAmount"));
  const currentAmount = Number(formData.get("currentAmount") ?? 0);
  const categoryOptionId = String(formData.get("categoryOptionId") ?? "");

  if (!title) return;
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return;
  if (!Number.isFinite(currentAmount) || currentAmount < 0) return;
  const categoryOption = await prisma.piggyBankCategoryOption.findFirst({
    where: { id: categoryOptionId, userId },
    select: { id: true, group: true },
  });
  if (!categoryOption) return;

  await prisma.piggyBankItem.create({
    data: {
      userId,
      title,
      category: categoryOption.group,
      categoryOptionId: categoryOption.id,
      targetAmount: Math.round(targetAmount),
      currentAmount: Math.round(currentAmount),
      startDate: parseDate(formData.get("startDate")),
      targetDate: parseDate(formData.get("targetDate")),
      status: parseStatus(formData.get("status")),
      note: String(formData.get("note") ?? "").trim(),
    },
  });

  revalidatePath("/piggybank");
}

export async function updatePiggyBankItem(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const targetAmount = Number(formData.get("targetAmount"));
  const currentAmount = Number(formData.get("currentAmount"));
  const categoryOptionId = String(formData.get("categoryOptionId") ?? "");

  if (!id || !title) return;
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return;
  if (!Number.isFinite(currentAmount) || currentAmount < 0) return;
  const categoryOption = await prisma.piggyBankCategoryOption.findFirst({
    where: { id: categoryOptionId, userId },
    select: { id: true, group: true },
  });
  if (!categoryOption) return;

  await prisma.piggyBankItem.updateMany({
    where: { id, userId },
    data: {
      title,
      category: categoryOption.group,
      categoryOptionId: categoryOption.id,
      targetAmount: Math.round(targetAmount),
      currentAmount: Math.round(currentAmount),
      startDate: parseDate(formData.get("startDate")),
      targetDate: parseDate(formData.get("targetDate")),
      status: parseStatus(formData.get("status")),
      note: String(formData.get("note") ?? "").trim(),
    },
  });

  revalidatePath("/piggybank");
}

export async function deletePiggyBankItem(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.piggyBankItem.deleteMany({ where: { id, userId } });

  revalidatePath("/piggybank");
}
