"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PIGGYBANK_CATEGORIES, PIGGYBANK_STATUSES } from "@/lib/piggyBankCategories";
import type { PiggyBankCategory, PiggyBankItemStatus } from "@/generated/prisma/enums";

function parseCategory(value: FormDataEntryValue | null): PiggyBankCategory {
  const category = String(value ?? "OTHER");
  return (PIGGYBANK_CATEGORIES as string[]).includes(category) ? (category as PiggyBankCategory) : "OTHER";
}

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

  if (!title) return;
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return;
  if (!Number.isFinite(currentAmount) || currentAmount < 0) return;

  await prisma.piggyBankItem.create({
    data: {
      userId,
      title,
      category: parseCategory(formData.get("category")),
      targetAmount: Math.round(targetAmount),
      currentAmount: Math.round(currentAmount),
      startDate: parseDate(formData.get("startDate")),
      targetDate: parseDate(formData.get("targetDate")),
      status: parseStatus(formData.get("status")),
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

  if (!id || !title) return;
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return;
  if (!Number.isFinite(currentAmount) || currentAmount < 0) return;

  await prisma.piggyBankItem.updateMany({
    where: { id, userId },
    data: {
      title,
      category: parseCategory(formData.get("category")),
      targetAmount: Math.round(targetAmount),
      currentAmount: Math.round(currentAmount),
      startDate: parseDate(formData.get("startDate")),
      targetDate: parseDate(formData.get("targetDate")),
      status: parseStatus(formData.get("status")),
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
