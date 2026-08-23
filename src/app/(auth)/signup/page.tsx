import Link from "next/link";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-ice px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-lg font-black text-navy">UniPig 회원가입</h1>
        <p className="mt-1 text-sm text-navy/60">아이디와 비밀번호만 있으면 시작할 수 있어요.</p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-navy/60">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-bold text-cobalt">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
