"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { usernameSchema, passwordSchema, toSyntheticEmail } from "@/lib/username";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export type LoginFormState = { error?: string } | undefined;

export async function login(_state: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "아이디 또는 비밀번호가 올바르지 않아요" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: toSyntheticEmail(parsed.data.username),
    password: parsed.data.password,
  });

  if (error) {
    return { error: "아이디 또는 비밀번호가 올바르지 않아요" };
  }

  redirect("/");
}
