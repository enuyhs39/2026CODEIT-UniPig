import { PiggyBankBoard } from "@/components/piggybank/piggy-bank-board";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function PiggyBankPage() {
  const userId = await requireUserId();
  const [items, categories] = await Promise.all([
    prisma.piggyBankItem.findMany({
      where: { userId },
      orderBy: { targetDate: "asc" },
      include: { categoryOption: true },
    }),
    prisma.piggyBankCategoryOption.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[17px] font-bold">저금통</h1>
      <PiggyBankBoard
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          targetAmount: item.targetAmount,
          currentAmount: item.currentAmount,
          startDate: toDateInputValue(item.startDate),
          targetDate: toDateInputValue(item.targetDate),
          status: item.status,
          note: item.note,
          categoryOption: item.categoryOption
            ? {
                id: item.categoryOption.id,
                label: item.categoryOption.label,
                color: item.categoryOption.color,
                group: item.categoryOption.group,
              }
            : null,
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          label: category.label,
          color: category.color,
          group: category.group,
        }))}
      />
    </div>
  );
}
