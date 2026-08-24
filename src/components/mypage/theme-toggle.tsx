"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const COOKIE_NAME = "unipig-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function applyTheme(next: Theme) {
    setTheme(next);
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${COOKIE_MAX_AGE}`;
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-4">
      <div>
        <p className="text-sm font-bold">다크모드</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">화면 테마를 직접 선택해요</p>
      </div>
      <div className="flex gap-1 rounded-full bg-track p-1">
        <button
          type="button"
          onClick={() => applyTheme("light")}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
            theme === "light" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          라이트
        </button>
        <button
          type="button"
          onClick={() => applyTheme("dark")}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
            theme === "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          다크
        </button>
      </div>
    </div>
  );
}
