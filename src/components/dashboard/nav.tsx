"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/transactions", label: "거래" },
  { href: "/budget", label: "예산" },
  { href: "/simulation", label: "시뮬레이션" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-card-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-5 py-3">
          <span className="mr-3 text-[15px] font-extrabold tracking-tight">UniPig</span>
          <nav aria-label="주 메뉴" className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive(pathname, item.href) && "bg-accent-soft text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <nav
        aria-label="하단 메뉴"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-card-border bg-card px-1 pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10.5px] font-medium text-muted-foreground",
              isActive(pathname, item.href) && "text-accent",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
