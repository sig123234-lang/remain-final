export default function TalkSessionPage() {
    return (
      <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f7ead7_45%,#edf3e8_100%)] px-5 py-5 text-[#3a2f28]">
        <style>{`
          @keyframes breathe {
            0%, 100% { transform: scale(0.94); opacity: 0.55; }
            50% { transform: scale(1.08); opacity: 0.9; }
          }
  
          @keyframes drift {
            0%, 100% { transform: translateX(-18px) rotate(0deg); }
            50% { transform: translateX(18px) rotate(8deg); }
          }
  
          @keyframes petalFall {
            0% { transform: translateY(-35px) translateX(0) rotate(0deg); opacity: 0; }
            20% { opacity: 0.75; }
            100% { transform: translateY(210px) translateX(42px) rotate(180deg); opacity: 0; }
          }
  
          .petal {
            position: absolute;
            width: 9px;
            height: 14px;
            border-radius: 999px 999px 999px 0;
            background: rgba(238, 156, 174, 0.65);
            animation: petalFall 7s linear infinite;
          }
        `}</style>
  
        <div className="mx-auto flex h-full max-w-md flex-col">
          {/* 상단 */}
          <header className="flex shrink-0 items-start justify-between">
            <div>
              <h1 className="text-[34px] font-black tracking-tight">
                rem<span className="text-[#7f9f72]">AI</span>n
              </h1>
              <p className="mt-1 text-sm text-[#8a7463]">
                천천히 이야기 나눠요
              </p>
            </div>
  
            <button className="rounded-full bg-[#fff8ef]/90 px-4 py-2.5 text-sm font-bold text-[#7b6a5a] shadow-sm ring-1 ring-white/80">
              도움 요청
            </button>
          </header>
  
          {/* 중앙 */}
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 py-4">
            {/* AI 계절 호흡 원 */}
            <div className="relative flex h-52 w-52 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff8ef]/85 shadow-[0_24px_70px_rgba(106,79,48,0.16)] ring-1 ring-white/90">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,#fff7df_0%,#f6dfc5_35%,#dcebd7_74%,#cbdcc7_100%)]" />
  
              {/* 물결 */}
              <div
                className="absolute h-40 w-40 rounded-full border-[14px] border-white/35"
                style={{ animation: "breathe 4.2s ease-in-out infinite" }}
              />
              <div
                className="absolute h-30 w-30 rounded-full border-[11px] border-[#f4d6b8]/45"
                style={{ animation: "breathe 3.4s ease-in-out infinite" }}
              />
              <div
                className="absolute h-24 w-24 rounded-full border-[8px] border-[#b9d0b7]/45"
                style={{ animation: "breathe 2.8s ease-in-out infinite" }}
              />
  
              {/* 흐르는 빛 */}
              <div
                className="absolute h-16 w-48 rounded-full bg-white/28 blur-xl"
                style={{ animation: "drift 7s ease-in-out infinite" }}
              />
              <div
                className="absolute h-14 w-44 rounded-full bg-[#f7cfa9]/24 blur-xl"
                style={{ animation: "drift 8.5s ease-in-out infinite" }}
              />
  
              {/* 봄 벚꽃 */}
              <span className="petal left-[45px] top-[12px]" />
              <span className="petal left-[95px] top-[0px]" style={{ animationDelay: "1.4s" }} />
              <span className="petal left-[145px] top-[24px]" style={{ animationDelay: "2.7s" }} />
  
              <div className="relative z-10 text-center">
                <p className="text-sm font-bold text-[#7f6c5a]">
                  듣고 있어요
                </p>
                <p className="mt-1 text-xs text-[#9a8571]">
                  천천히 말씀해 주세요
                </p>
              </div>
            </div>
  
            {/* 질문 카드 */}
            <section className="w-full rounded-[34px] bg-[#fffaf2]/92 p-7 text-center shadow-[0_20px_60px_rgba(93,68,42,0.12)] ring-1 ring-white/90">
              <p className="mb-4 inline-flex rounded-full bg-[#f2eadf] px-4 py-2 text-sm font-bold text-[#8a715c]">
                이야기 도우미가 여쭤볼게요
              </p>
  
              <h2 className="text-[28px] font-black leading-[1.48] tracking-tight text-[#3a2f28]">
                초등학교 다니실 때
                <br />
                겨울 되면 자주 먹던
                <br />
                음식 기억나세요?
              </h2>
  
              <p className="mt-5 text-[15px] leading-relaxed text-[#8a7463]">
                기억나는 만큼만 편하게 말씀해 주세요.
              </p>
            </section>
          </main>
  
          {/* 하단 */}
          <footer className="shrink-0 pb-1">
            <button className="flex h-20 w-full items-center justify-center rounded-[32px] bg-[#8ba77c] text-[22px] font-black text-white shadow-[0_18px_42px_rgba(99,125,86,0.3)] active:scale-[0.99]">
              말씀해 주세요
            </button>
  
            <p className="mt-3 text-center text-sm font-medium text-[#8a7463]">
              대화가 어려우시면 도움 요청을 눌러주세요.
            </p>
          </footer>
        </div>
      </div>
    );
  }