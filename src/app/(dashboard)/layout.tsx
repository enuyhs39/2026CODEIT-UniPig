import { DashboardNav } from "@/components/dashboard/nav";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-7 pb-24 sm:pb-7">
        {children}
      </main>
    </div>
  );
}
