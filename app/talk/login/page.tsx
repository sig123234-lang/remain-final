import Link from "next/link";

export default function TalkLoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 py-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <section className="rounded-[36px] bg-[#fffaf2]/92 p-8 text-center shadow-[0_24px_70px_rgba(93,68,42,0.12)] ring-1 ring-white/90">
          <h1 className="text-[42px] font-black tracking-tight">
            rem<span className="text-[#7f9f72]">AI</span>n
          </h1>

          <p className="mt-2 text-sm text-[#8a7463]">
            따뜻한 이야기 도우미
          </p>

          <div className="mt-10 text-left">
            <label className="text-sm font-bold text-[#8a715c]">
              입장 코드
            </label>

            <input
              placeholder="코드를 입력해 주세요"
              className="mt-2 h-16 w-full rounded-2xl border border-[#eadfce] bg-[#faf7f1] px-5 text-lg outline-none focus:border-[#8ba77c]"
            />
          </div>

          <Link
            href="/talk/today"
            className="mt-8 flex h-20 w-full items-center justify-center rounded-[34px] bg-[#8ba77c] text-[22px] font-black text-white shadow-[0_18px_42px_rgba(99,125,86,0.3)]"
          >
            들어가기
          </Link>

          <p className="mt-5 text-sm leading-relaxed text-[#8a7463]">
            관리사가 안내한 코드를 입력하면
            <br />
            오늘의 이야기 화면으로 이동합니다.
          </p>
        </section>
      </div>
    </div>
  );
}