import { z } from "zod";

/** 아이디는 로그인 화면에 그대로 보이는 값. Supabase Auth 내부에서는 이메일로 변환해서 저장한다. */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "아이디는 3자 이상이어야 해요")
  .max(20, "아이디는 20자 이하여야 해요")
  .regex(/^[a-z0-9_]+$/, "아이디는 영문 소문자, 숫자, 밑줄(_)만 사용할 수 있어요");

export const passwordSchema = z.string().min(8, "비밀번호는 8자 이상이어야 해요");

const SYNTHETIC_EMAIL_DOMAIN = "unipig.local";

/** 사용자에게는 절대 노출하지 않는 내부 변환 — Supabase Auth가 이메일 기반이라 아이디를 여기 맞춰 감싼다. */
export function toSyntheticEmail(username: string): string {
  return `${username.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}
