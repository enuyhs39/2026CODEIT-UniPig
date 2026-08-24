import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ThemeToggle } from "@/components/mypage/theme-toggle";
import { CategoryManager } from "@/components/mypage/category-manager";
import { updateNickname } from "./actions";

export default async function MyPage() {
  const userId = await requireUserId();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("unipig-theme")?.value;
  const initialTheme = themeCookie === "dark" ? "dark" : "light";

  const [preference, categories, savingCategories] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.ledgerCategory.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.piggyBankCategoryOption.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <h1 className="text-[17px] font-bold">마이페이지</h1>

      <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="text-sm font-bold">별칭</h2>
        <p className="text-[12px] text-muted-foreground">
          홈 화면에 &quot;유니피그(별칭)&quot;으로 표시돼요.
        </p>
        <form action={updateNickname} className="flex gap-2">
          <input
            type="text"
            name="nickname"
            maxLength={20}
            defaultValue={preference?.nickname ?? ""}
            placeholder="예: 꿀꿀1호"
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            저장
          </button>
        </form>
      </section>

      <ThemeToggle initialTheme={initialTheme} />

      <CategoryManager ledgerCategories={categories} savingCategories={savingCategories} />
    </div>
  );
}
