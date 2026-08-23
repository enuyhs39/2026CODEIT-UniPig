"use server";

import { redirect } from "next/navigation";
import { signupSchema } from "./schema";
import { toSyntheticEmail } from "@/lib/username";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignupFormState = { error?: string } | undefined;

function isDuplicateUsername(error: { status?: number; code?: string; message: string }): boolean {
  return error.status === 422 || error.code === "email_exists" || /already registered/i.test(error.message);
}

export async function signup(_state: SignupFormState, formData: FormData): Promise<SignupFormState> {
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요" };
  }

  const { username, password } = parsed.data;
  const email = toSyntheticEmail(username);

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (isDuplicateUsername(error)) {
      return { error: "이미 사용 중인 아이디예요" };
    }
    return { error: "회원가입 중 문제가 발생했어요. 다시 시도해주세요" };
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { error: "가입은 완료됐지만 로그인에 실패했어요. 로그인 화면에서 다시 시도해주세요" };
  }

  redirect("/budget");
}
