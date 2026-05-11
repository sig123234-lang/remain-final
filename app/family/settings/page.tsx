import FamilyBottomTab from "@/components/family/FamilyBottomTab";

export default function FamilySettingsPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-[34px] font-black tracking-tight">
              rem
              <span className="text-[#7f9f72]">
                AI
              </span>
              n
            </h1>
            <p className="mt-1 text-sm text-[#8a7463]">
              가족 화면 설정과 안내예요
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff8ef]/92 text-xl shadow-sm ring-1 ring-white/90">
            ⚙️
          </div>
        </header>

        <main className="mt-6 flex flex-1 flex-col gap-4">
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <h2 className="text-[22px] font-black">
              현재 안내
            </h2>
            <p className="mt-4 text-[16px] leading-[1.85] text-[#6f5d50]">
              가족 화면은 어르신의 대화 기록을 차분하게 확인하는 read-only
              공간으로 운영되고 있어요.
            </p>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <h2 className="text-[22px] font-black">
              이후 연결 예정
            </h2>
            <div className="mt-4 space-y-3 text-[16px] leading-[1.8] text-[#6f5d50]">
              <p>월간 리포트 공유</p>
              <p>보호자 알림 빈도 설정</p>
              <p>가족용 요약 문구 관리</p>
            </div>
          </section>
        </main>
      </div>

      <FamilyBottomTab />
    </div>
  );
}
