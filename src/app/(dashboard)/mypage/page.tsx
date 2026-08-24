import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/mypage/theme-toggle";
import { CategoryColorPicker } from "@/components/mypage/category-color-picker";
import { AiGroupSelect } from "@/components/mypage/ai-group-select";
import { PALETTE_BADGE_CLASSES } from "@/lib/categoryColors";
import {
  createLedgerCategory,
  deleteLedgerCategory,
  updateLedgerCategory,
  updateNickname,
} from "./actions";

export default async function MyPage() {
  const userId = await requireUserId();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("unipig-theme")?.value;
  const initialTheme = themeCookie === "dark" ? "dark" : "light";

  const [preference, categories] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.ledgerCategory.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <h1 className="text-[17px] font-bold">마이페이지</h1>

      <section className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4">
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

      <section className="flex flex-col gap-3.5">
        <div>
          <h2 className="text-sm font-bold">구분 관리</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            지출/수입 내역에서 쓰는 &quot;구분&quot; 목록이에요. 색을 지정해두면 목록에서 배지로 표시되고, AI
            그룹을 지정해두면 AI피그 예산 계산에도 반영돼요.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-col gap-2.5 rounded-2xl border border-card-border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <form action={updateLedgerCategory} className="flex flex-1 flex-wrap items-center gap-2.5">
                <input type="hidden" name="id" value={category.id} />
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    PALETTE_BADGE_CLASSES[category.color],
                  )}
                >
                  {category.label}
                </span>
                <input
                  type="text"
                  name="label"
                  maxLength={20}
                  defaultValue={category.label}
                  className="w-28 rounded-lg border border-card-border bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-accent"
                />
                <CategoryColorPicker name="color" idPrefix={category.id} defaultValue={category.color} />
                <AiGroupSelect
                  name="aiGroup"
                  defaultValue={category.expenseGroup ?? category.incomeGroup ?? "OTHER"}
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-card-border px-2.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  저장
                </button>
              </form>
              <form action={deleteLedgerCategory}>
                <input type="hidden" name="id" value={category.id} />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-danger transition-opacity hover:opacity-70"
                >
                  삭제
                </button>
              </form>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="py-2 text-[13px] text-muted-foreground">아직 등록된 구분이 없어요</p>
          )}
        </div>

        <form
          action={createLedgerCategory}
          className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-card-border p-4"
        >
          <p className="text-[12.5px] font-bold text-muted-foreground">새 구분 추가</p>
          <input
            type="text"
            name="label"
            required
            maxLength={20}
            placeholder="구분 이름 (예: 문화/전시)"
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <div className="flex flex-wrap items-center gap-2.5">
            <CategoryColorPicker name="color" idPrefix="new" defaultValue="DEFAULT" />
            <AiGroupSelect name="aiGroup" defaultValue="FOOD" />
          </div>
          <button
            type="submit"
            className="self-start rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            추가
          </button>
        </form>
      </section>
    </div>
  );
}
