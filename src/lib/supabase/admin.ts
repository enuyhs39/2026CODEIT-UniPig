import { createClient } from "@supabase/supabase-js";

/**
 * service-role 클라이언트 — 쿠키 없음, 서버 전용. 회원가입에서 auth.admin.createUser 호출에만 쓴다.
 * SUPABASE_SERVICE_ROLE_KEY가 없으면(아직 .env에 채워 넣지 않은 상태) 호출 시점에 에러를 던진다.
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다 (.env 확인)");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
