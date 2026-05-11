export default function TalkOnboardingPage() {
    return (
      <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 py-6 text-[#3d3128]">
        <div className="mx-auto flex h-full max-w-md flex-col">
          <header className="shrink-0 pt-2">
            <h1 className="text-[34px] font-black tracking-tight">
              rem<span className="text-[#7f9f72]">AI</span>n
            </h1>
  
            <p className="mt-1 text-sm text-[#8a7463]">
              따뜻한 이야기 도우미
            </p>
          </header>
  
          <main className="flex min-h-0 flex-1 flex-col pt-10">
            <section className="rounded-[36px] bg-[#fffaf2]/92 p-7 shadow-[0_24px_70px_rgba(93,68,42,0.12)] ring-1 ring-white/90">
              <div className="mb-5 inline-flex rounded-full bg-[#f2eadf] px-4 py-2 text-sm font-bold text-[#8a715c]">
                처음 만나서 반가워요
              </div>
  
              <h2 className="text-[31px] font-black leading-[1.42] tracking-tight">
                편안하게
                <br />
                이야기를 나누는
                <br />
                시간이에요
              </h2>
  
              <div className="mt-6 space-y-4 text-[16px] leading-[1.75] text-[#6f5d50]">
                <p>
                  remAIn은 이야기를 함께 나누는
                  따뜻한 대화 도우미예요.
                </p>
  
                <p>
                  기억나는 만큼만
                  천천히 말씀해 주셔도 괜찮아요.
                </p>
  
                <p>
                  익숙한 이야기부터
                  함께 시작해볼게요.
                </p>
              </div>
            </section>
  
            <section className="mt-5 rounded-[32px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[20px] font-black">
                    목소리 선택
                  </h3>
  
                  <p className="mt-1 text-sm text-[#8a7463]">
                    편안한 목소리를 골라주세요
                  </p>
                </div>
  
                <div className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-bold text-[#6f9075]">
                  추천
                </div>
              </div>
  
              <div className="mt-4 space-y-3">
                <button className="flex w-full items-center justify-between rounded-2xl bg-[#f8f3ea] px-5 py-4 text-left ring-2 ring-[#8ba77c]">
                  <div>
                    <p className="text-[17px] font-bold">
                      따뜻한 여성 목소리
                    </p>
  
                    <p className="mt-1 text-sm text-[#8a7463]">
                      부드럽고 편안한 느낌
                    </p>
                  </div>
  
                  <div className="h-5 w-5 rounded-full bg-[#8ba77c]" />
                </button>
  
                <button className="flex w-full items-center justify-between rounded-2xl bg-[#faf7f1] px-5 py-4">
                  <div>
                    <p className="text-[17px] font-bold">
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
          </main>
  
          <footer className="shrink-0 pb-2">
            <button className="flex h-20 w-full items-center justify-center rounded-[34px] bg-[#8ba77c] text-[22px] font-black text-white shadow-[0_18px_42px_rgba(99,125,86,0.3)] active:scale-[0.99]">
              이야기 시작하기
            </button>
  
            <p className="mt-3 text-center text-sm text-[#8a7463]">
              천천히 함께 이야기 나눠봐요
            </p>
          </footer>
        </div>
      </div>
    );
  }