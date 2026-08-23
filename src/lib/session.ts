import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 현재 로그인한 사용자를 반환한다. getSession()이 아니라 getUser()를 쓰는 이유 —
 * getUser()는 Supabase 인증 서버에 JWT를 재검증하므로, 쿠키만 까보는 optimistic 체크(proxy.ts)와
 * 달리 여기가 실제 "진짜 검증" 지점이다.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Route Handler용 — 없으면 null, 호출부가 401 처리. */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/** Server Component/Server Action용 — 없으면 /login으로 redirect. */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user.id;
}
