"use client";

import { useActionState } from "react";
import { login, type LoginFormState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginFormState, FormData>(login, undefined);

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
          autoComplete="current-password"
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
        {pending ? "로그인하는 중..." : "로그인"}
      </button>
    </form>
  );
}
