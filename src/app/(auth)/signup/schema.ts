import { z } from "zod";
import { usernameSchema, passwordSchema } from "@/lib/username";

export const signupSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않아요",
    path: ["passwordConfirm"],
  });
