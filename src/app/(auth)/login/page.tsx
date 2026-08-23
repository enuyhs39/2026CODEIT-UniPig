import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-ice px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-lg font-black text-navy">UniPig 로그인</h1>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-navy/60">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="font-bold text-cobalt">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
