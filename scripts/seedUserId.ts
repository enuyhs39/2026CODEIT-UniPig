/** 시드 스크립트는 인증 컨텍스트 밖에서 돌기 때문에 requireUserId()를 쓸 수 없다 — 대신 실제 Supabase 계정의 user id를 환경변수로 받는다. */
export function requireSeedUserId(): string {
  const userId = process.env.SEED_USER_ID;
  if (!userId) {
    throw new Error(
      ".env에 SEED_USER_ID=<실제 로그인해서 확인한 Supabase user id>를 추가한 뒤 다시 실행하세요.",
    );
  }
  return userId;
}
