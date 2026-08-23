"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "유니피그", icon: "/icons/nav-home.png" },
  { href: "/transactions", label: "지출/수입", icon: "/icons/nav-transactions.png" },
  { href: "/piggybank", label: "저금통", icon: "/icons/nav-piggybank.png" },
  { href: "/budget", label: "AI피그", icon: "/icons/nav-budget.png" },
  { href: "/simulation", label: "구매 시뮬레이션", icon: "/icons/nav-simulation.png" },
] as const;

const MYPAGE_HREF = "/mypage";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      />
    </svg>
  );
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-card-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-5 py-3">
          <span className="mr-3 text-[15px] font-extrabold tracking-tight">UniPig</span>
          <nav aria-label="주 메뉴" className="hidden flex-1 items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive(pathname, item.href) && "bg-accent-soft text-foreground",
                )}
              >
                <Image src={item.icon} alt="" width={20} height={20} className="shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href={MYPAGE_HREF}
            aria-label="마이페이지"
            className={cn(
              "ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground sm:ml-0",
              isActive(pathname, MYPAGE_HREF) && "bg-accent-soft text-foreground",
            )}
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>

      <nav
        aria-label="하단 메뉴"
        className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-30 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-1 rounded-full border border-card-border bg-card px-2 py-2 shadow-lg sm:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-medium whitespace-nowrap text-muted-foreground transition-colors",
              isActive(pathname, item.href) && "bg-accent-soft text-foreground",
            )}
          >
            <Image src={item.icon} alt="" width={28} height={28} />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
