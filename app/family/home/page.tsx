import FamilyBottomTab from "@/components/family/FamilyBottomTab";

const memories = [
  "🍲 떡국",
  "🏠 고향집",
  "👩 어머니",
  "❄️ 겨울 아침",
];

const emotions = [
  {
    label: "안정",
    emoji: "🌿",
  },
  {
    label: "편안",
    emoji: "☀️",
  },
  {
    label: "그리움",
    emoji: "🌙",
  },
];

export default function FamilyHomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        
        {/* 헤더 */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-[34px] font-black tracking-tight">
              rem<span className="text-[#7f9f72]">AI</span>n
            </h1>

            <p className="mt-1 text-sm text-[#8a7463]">
              오늘도 따뜻한 대화가 이어졌어요
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff8ef]/92 text-xl shadow-sm ring-1 ring-white/90">
            💛
          </div>
        </header>

        <main className="mt-6 flex flex-1 flex-col gap-4">
          
          {/* 상태 카드 */}
          <section className="rounded-[34px] bg-[#fffaf2]/92 p-6 shadow-[0_22px_60px_rgba(93,68,42,0.12)] ring-1 ring-white/90">
            
            <div className="flex items-start justify-between">
              
              <div>
                <div className="inline-flex rounded-full bg-[#f2eadf] px-4 py-2 text-sm font-bold text-[#8a715c]">
                  오늘 상태
                </div>

                <h2 className="mt-5 text-[30px] font-black leading-[1.42] tracking-tight">
                  김영자 어르신은
                  <br />
                  오늘도 편안하게
                  <br />
                  이야기를 나누셨어요
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#edf4ec] text-2xl">
                🌿
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              
              <div className="rounded-2xl bg-[#f8f3ea] p-4">
                <p className="text-sm text-[#8a7463]">
                  마지막 대화
                </p>

                <p className="mt-2 text-lg font-black">
                  오늘 오후 2:10
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8f3ea] p-4">
                <p className="text-sm text-[#8a7463]">
                  현재 상태
                </p>

                <p className="mt-2 text-lg font-black">
                  안정적
                </p>
              </div>
            </div>
          </section>

          {/* 최근 기억 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              
              <div>
                <h3 className="text-[22px] font-black">
                  최근 자주 나온 기억
                </h3>

                <p className="mt-1 text-sm text-[#8a7463]">
                  최근 대화 속에서 자주 등장했어요
                </p>
              </div>

              <div className="text-2xl">
                ✨
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {memories.map((memory) => (
                <div
                  key={memory}
                  className="rounded-full bg-[#f6efe4] px-4 py-3 text-[15px] font-bold text-[#6f5d50]"
                >
                  {memory}
                </div>
              ))}
            </div>
          </section>

          {/* 오늘 대화 요약 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              
              <div>
                <h3 className="text-[22px] font-black">
                  오늘 이야기
                </h3>

                <p className="mt-1 text-sm text-[#8a7463]">
                  AI가 대화를 정리했어요
                </p>
              </div>

              <div className="text-2xl">
                📖
              </div>
            </div>

            <div className="mt-5 rounded-[26px] bg-[#f8f3ea] p-5">
              <p className="text-[17px] leading-[1.9] text-[#6f5d50]">
                오늘은 어린 시절 겨울 음식 이야기를 나누셨어요.
                어머니와 함께 떡국을 먹던 기억을 편안하게 떠올리셨어요.
              </p>
            </div>
          </section>

          {/* 감정 흐름 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              
              <div>
                <h3 className="text-[22px] font-black">
                  최근 감정 흐름
                </h3>

                <p className="mt-1 text-sm text-[#8a7463]">
                  대화 속 감정을 정리했어요
                </p>
              </div>

              <div className="text-2xl">
                🌙
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              {emotions.map((emotion) => (
                <div
                  key={emotion.label}
                  className="flex flex-1 flex-col items-center rounded-[24px] bg-[#f8f3ea] px-3 py-4"
                >
                  <div className="text-3xl">
                    {emotion.emoji}
                  </div>

                  <p className="mt-2 text-[15px] font-bold text-[#6f5d50]">
                    {emotion.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <FamilyBottomTab />
    </div>
  );
}