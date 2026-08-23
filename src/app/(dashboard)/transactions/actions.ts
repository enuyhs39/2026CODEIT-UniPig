"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function createLedgerEntry(formData: FormData) {
  const userId = await requireUserId();
  const date = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (!date || (type !== "EXPENSE" && type !== "INCOME")) return;
  if (!categoryId || !description) return;
  if (!Number.isFinite(amount) || amount <= 0) return;

  const category = await prisma.ledgerCategory.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category || category.type !== type) return;

  await prisma.ledgerEntry.create({
    data: {
      userId,
      date: new Date(date),
      type,
      categoryId: category.id,
      description,
      amount: Math.round(amount),
    },
  });

  revalidatePath("/transactions");
}

export async function toggleLedgerEntryDone(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const isDone = formData.get("isDone") === "true";
  if (!id) return;

  await prisma.ledgerEntry.updateMany({
    where: { id, userId },
    data: { isDone: !isDone },
  });

  revalidatePath("/transactions");
}

export async function deleteLedgerEntry(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.ledgerEntry.deleteMany({ where: { id, userId } });

  revalidatePath("/transactions");
}
