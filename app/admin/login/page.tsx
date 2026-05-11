import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] px-6 py-6 text-[#1f2937]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        
        <section className="rounded-[32px] bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          
          <div>
            <h1 className="text-[38px] font-black tracking-tight">
              rem<span className="text-[#7f9f72]">AI</span>n
            </h1>

            <p className="mt-2 text-sm text-[#6b7280]">
              관리자 시스템
            </p>
          </div>

          <div className="mt-10">
            
            <label className="text-sm font-bold text-[#4b5563]">
              관리자 ID
            </label>

            <input
              placeholder="admin"
              className="mt-2 h-14 w-full rounded-2xl border border-[#dbe2ea] bg-[#f9fafb] px-4 outline-none focus:border-[#7f9f72]"
            />
          </div>

          <div className="mt-5">
            
            <label className="text-sm font-bold text-[#4b5563]">
              비밀번호
            </label>

            <input
              type="password"
              placeholder="••••••••"
              className="mt-2 h-14 w-full rounded-2xl border border-[#dbe2ea] bg-[#f9fafb] px-4 outline-none focus:border-[#7f9f72]"
            />
          </div>

          <Link
            href="/admin/sessions/live"
            className="mt-8 flex h-16 w-full items-center justify-center rounded-2xl bg-[#7f9f72] text-lg font-black text-white shadow-[0_16px_36px_rgba(99,125,86,0.25)]"
          >
            관리자 로그인
          </Link>

          <div className="mt-8 rounded-2xl bg-[#f8faf9] p-4">
            <p className="text-xs leading-relaxed text-[#6b7280]">
              실시간 대화 모니터링, 추천 질문,
              감정 흐름 분석 및 AI 진행 제어가 가능합니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}