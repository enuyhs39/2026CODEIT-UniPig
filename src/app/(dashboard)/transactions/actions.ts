"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/config";

export async function createLedgerEntry(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (!date || (type !== "EXPENSE" && type !== "INCOME")) return;
  if (!categoryId || !description) return;
  if (!Number.isFinite(amount) || amount <= 0) return;

  const category = await prisma.ledgerCategory.findFirst({
    where: { id: categoryId, userId: DEMO_USER_ID },
  });
  if (!category || category.type !== type) return;

  await prisma.ledgerEntry.create({
    data: {
      userId: DEMO_USER_ID,
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
  const id = String(formData.get("id") ?? "");
  const isDone = formData.get("isDone") === "true";
  if (!id) return;

  await prisma.ledgerEntry.updateMany({
    where: { id, userId: DEMO_USER_ID },
    data: { isDone: !isDone },
  });

  revalidatePath("/transactions");
}

export async function deleteLedgerEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.ledgerEntry.deleteMany({ where: { id, userId: DEMO_USER_ID } });

  revalidatePath("/transactions");
}
