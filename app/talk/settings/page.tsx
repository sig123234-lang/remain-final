import BottomTab from "@/components/talk/BottomTab";
import Header from "@/components/talk/Header";

export default function SettingsPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        
        <Header subtitle="편안한 환경으로 맞춰드릴게요" />

        <main className="mt-6 flex flex-1 flex-col gap-4">
          
          {/* 목소리 설정 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  목소리 설정
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  편안한 목소리를 선택해 주세요
                </p>
              </div>

              <div className="text-2xl">
                🎙️
              </div>
            </div>

            <div className="mt-5 space-y-3">
              
              <button className="flex w-full items-center justify-between rounded-[24px] bg-[#f8f3ea] px-5 py-4 ring-2 ring-[#8ba77c]">
                <div className="text-left">
                  <p className="text-[17px] font-black">
                    따뜻한 여성 목소리
                  </p>

                  <p className="mt-1 text-sm text-[#8a7463]">
                    부드럽고 편안한 느낌
                  </p>
                </div>

                <div className="h-5 w-5 rounded-full bg-[#8ba77c]" />
              </button>

              <button className="flex w-full items-center justify-between rounded-[24px] bg-[#faf7f1] px-5 py-4">
                <div className="text-left">
                  <p className="text-[17px] font-black">
                    차분한 남성 목소리
                  </p>

                  <p className="mt-1 text-sm text-[#8a7463]">
                    안정적이고 조용한 느낌
                  </p>
                </div>

                <div className="h-5 w-5 rounded-full border-2 border-[#d8cdbf]" />
              </button>
            </div>
          </section>

          {/* 글자 크기 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  글자 크기
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  읽기 편한 크기로 조절해 주세요
                </p>
              </div>

              <div className="text-2xl">
                🔠
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              
              <button className="flex-1 rounded-[22px] bg-[#f8f3ea] py-4 text-[16px] font-black text-[#6f5d50]">
                보통
              </button>

              <button className="flex-1 rounded-[22px] bg-[#edf4ec] py-4 text-[18px] font-black text-[#6f9075] ring-2 ring-[#8ba77c]">
                크게
              </button>

              <button className="flex-1 rounded-[22px] bg-[#f8f3ea] py-4 text-[20px] font-black text-[#6f5d50]">
                아주 크게
              </button>
            </div>
          </section>

          {/* 말하기 속도 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  말하기 속도
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  천천히 들으실 수 있도록 조절해요
                </p>
              </div>

              <div className="text-2xl">
                ⏳
              </div>
            </div>

            <div className="mt-5">
              
              <div className="flex items-center justify-between text-sm font-bold text-[#8a7463]">
                <span>천천히</span>
                <span>보통</span>
                <span>빠르게</span>
              </div>

              <div className="relative mt-5 h-3 rounded-full bg-[#f2eadf]">
                <div className="absolute left-[28%] top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#8ba77c] shadow-lg" />
              </div>
            </div>
          </section>

          {/* 보호자 연결 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  보호자 연결
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  보호자와 연결되어 있어요
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf4ec] text-xl">
                🌿
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#f8f3ea] p-5">
              <div className="flex items-center justify-between">
                
                <div>
                  <p className="text-[18px] font-black">
                    김민수 보호자
                  </p>

                  <p className="mt-1 text-sm text-[#8a7463]">
                    최근 확인 · 오늘 오후 1:20
                  </p>
                </div>

                <div className="rounded-full bg-[#edf4ec] px-4 py-2 text-sm font-black text-[#6f9075]">
                  연결됨
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}