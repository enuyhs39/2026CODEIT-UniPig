"use client";

import { useActionState } from "react";
import { signup, type SignupFormState } from "./actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupFormState, FormData>(signup, undefined);

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-navy/70">
          아이디
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          className="rounded-xl bg-ice px-3 py-2.5 text-navy"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-navy/70">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="rounded-xl bg-ice px-3 py-2.5 text-navy"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="passwordConfirm" className="text-sm font-medium text-navy/70">
          비밀번호 확인
        </label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          className="rounded-xl bg-ice px-3 py-2.5 text-navy"
        />
      </div>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-navy px-6 py-3 text-sm font-extrabold text-white disabled:opacity-50"
      >
        {pending ? "가입하는 중..." : "가입하기"}
      </button>
    </form>
  );
}
