import BottomTab from "@/components/talk/BottomTab";
import Header from "@/components/talk/Header";

const records = [
  {
    date: "오늘 오후 2:10",
    title: "겨울 음식 이야기",
    summary:
      "어머니와 함께 떡국을 먹던 기억을 떠올리셨어요.",
    emotions: ["🌿 안정", "🌙 그리움"],
    memories: ["🍲 떡국", "👩 어머니", "❄️ 겨울"],
  },

  {
    date: "어제 오후 4:22",
    title: "고향집 이야기",
    summary:
      "어린 시절 살던 집과 골목길 이야기를 나누셨어요.",
    emotions: ["☀️ 편안", "🏠 익숙함"],
    memories: ["🏠 고향집", "🚪 골목길"],
  },

  {
    date: "3일 전 오전 11:40",
    title: "학교 이야기",
    summary:
      "초등학교 운동장과 친구들 이야기를 하셨어요.",
    emotions: ["😊 즐거움", "🌿 안정"],
    memories: ["🏫 학교", "👫 친구"],
  },
];

export default function RecordsPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        
        <Header subtitle="함께 나눈 이야기들을 모아봤어요" />

        <main className="mt-6 flex flex-1 flex-col gap-4">
          
          {/* 상단 카드 */}
          <section className="rounded-[34px] bg-[#fffaf2]/92 p-6 shadow-[0_22px_60px_rgba(93,68,42,0.12)] ring-1 ring-white/90">
            
            <div className="inline-flex rounded-full bg-[#f2eadf] px-4 py-2 text-sm font-bold text-[#8a715c]">
              최근 기억 흐름
            </div>

            <h2 className="mt-5 text-[30px] font-black leading-[1.4] tracking-tight">
              최근에는
              <br />
              가족과 겨울에 대한
              <br />
              이야기가 많았어요
            </h2>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                "🍲 떡국",
                "👩 어머니",
                "🏠 고향집",
                "❄️ 겨울",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-full bg-[#f6efe4] px-4 py-3 text-[15px] font-bold text-[#6f5d50]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* 기록 리스트 */}
          <div className="space-y-4">
            {records.map((record) => (
              <section
                key={record.date}
                className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#8a7463]">
                      {record.date}
                    </p>

                    <h3 className="mt-2 text-[24px] font-black">
                      {record.title}
                    </h3>
                  </div>

                  <div className="text-2xl">
                    📖
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] bg-[#f8f3ea] p-5">
                  <p className="text-[16px] leading-[1.85] text-[#6f5d50]">
                    {record.summary}
                  </p>
                </div>

                {/* 감정 */}
                <div className="mt-5">
                  <p className="text-sm font-bold text-[#8a7463]">
                    느껴진 감정
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {record.emotions.map((emotion) => (
                      <div
                        key={emotion}
                        className="rounded-full bg-[#edf4ec] px-4 py-2 text-sm font-bold text-[#6f9075]"
                      >
                        {emotion}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 기억 */}
                <div className="mt-5">
                  <p className="text-sm font-bold text-[#8a7463]">
                    떠오른 기억
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {record.memories.map((memory) => (
                      <div
                        key={memory}
                        className="rounded-full bg-[#f6efe4] px-4 py-2 text-sm font-bold text-[#6f5d50]"
                      >
                        {memory}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}