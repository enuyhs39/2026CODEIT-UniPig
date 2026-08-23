import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Component/Server Action/Route Handler에서 쓰는 Supabase 클라이언트.
 * 쿠키 기반 세션이라 매 요청마다 새로 만든다(모듈 top-level 싱글턴 금지).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component에서 호출되면 쓰기가 막혀 있다 — proxy.ts가 세션 갱신을 담당하니 무시해도 된다.
          }
        },
      },
    },
  );
}
