export default function AdminHomePage() {
    return (
      <div className="min-h-screen p-6">
        {/* 상단 */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[42px] font-black tracking-tight">
              rem<span className="text-[#6f9075]">AI</span>n
            </h1>
  
            <p className="mt-1 text-[#7d766d]">
              회상 대화 운영 시스템
            </p>
          </div>
  
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-[#8b8377]">
                오늘 진행 세션
              </p>
  
              <p className="mt-1 text-2xl font-semibold">
                12개
              </p>
            </div>
  
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-[#8b8377]">
                현재 진행 중
              </p>
  
              <p className="mt-1 text-2xl font-semibold text-[#6f9075]">
                3개
              </p>
            </div>
          </div>
        </header>
  
        {/* 메인 */}
        <div className="grid grid-cols-[1fr_360px] gap-6">
  
          {/* 좌측 */}
          <section className="space-y-6">
  
            {/* 빠른 실행 */}
            <div className="rounded-[32px] bg-white p-7 shadow-sm">
              <h2 className="text-[32px] font-semibold">
                빠른 시작
              </h2>
  
              <div className="mt-6 grid grid-cols-3 gap-4">
  
                <button className="rounded-[24px] bg-[#f7f4ee] p-6 text-left transition hover:bg-[#f1ece3]">
                  <p className="text-[18px] font-semibold">
                    새 세션 시작
                  </p>
  
                  <p className="mt-2 text-[#7e776d]">
                    어르신과 새로운 대화 진행
                  </p>
                </button>
  
                <button className="rounded-[24px] bg-[#f7f4ee] p-6 text-left transition hover:bg-[#f1ece3]">
                  <p className="text-[18px] font-semibold">
                    어르신 등록
                  </p>
  
                  <p className="mt-2 text-[#7e776d]">
                    새 어르신 정보 추가
                  </p>
                </button>
  
                <button className="rounded-[24px] bg-[#f7f4ee] p-6 text-left transition hover:bg-[#f1ece3]">
                  <p className="text-[18px] font-semibold">
                    세션 기록
                  </p>
  
                  <p className="mt-2 text-[#7e776d]">
                    이전 대화 기록 보기
                  </p>
                </button>
              </div>
            </div>
  
            {/* 오늘 예정 */}
            <div className="rounded-[32px] bg-white p-7 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-[32px] font-semibold">
                  오늘 예정 세션
                </h2>
  
                <button className="text-[#6f9075]">
                  전체 보기
                </button>
              </div>
  
              <div className="mt-6 space-y-4">
  
                {[
                  {
                    name: "김영자 어르신",
                    age: "84세",
                    time: "오후 2:00",
                    status: "대기 중",
                  },
                  {
                    name: "박순례 어르신",
                    age: "79세",
                    time: "오후 2:30",
                    status: "진행 중",
                  },
                  {
                    name: "이춘자 어르신",
                    age: "88세",
                    time: "오후 3:00",
                    status: "예정",
                  },
                ].map((elderly, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-[24px] border border-[#ece4d8] bg-[#faf8f4] p-5"
                  >
                    <div className="flex items-center gap-4">
  
                      <div className="h-14 w-14 rounded-full bg-[#ddd]" />
  
                      <div>
                        <p className="text-[22px] font-semibold">
                          {elderly.name}
                        </p>
  
                        <p className="mt-1 text-[#7e776d]">
                          {elderly.age} · {elderly.time}
                        </p>
                      </div>
                    </div>
  
                    <div className="rounded-full bg-[#edf4ec] px-4 py-2 text-sm text-[#67836b]">
                      {elderly.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
  
            {/* 최근 세션 */}
            <div className="rounded-[32px] bg-white p-7 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-[32px] font-semibold">
                  최근 종료 세션
                </h2>
  
                <button className="text-[#6f9075]">
                  전체 보기
                </button>
              </div>
  
              <div className="mt-6 space-y-5">
  
                <div className="rounded-[24px] bg-[#f8f5ef] p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[22px] font-semibold">
                      김영자 어르신
                    </p>
  
                    <p className="text-[#8b8377]">
                      18분 진행
                    </p>
                  </div>
  
                  <p className="mt-3 text-[18px] leading-[1.8] text-[#5e584f]">
                    어린 시절 겨울 음식과
                    어머니 이야기를 중심으로 진행됨.
                  </p>
                </div>
  
                <div className="rounded-[24px] bg-[#f8f5ef] p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[22px] font-semibold">
                      박순례 어르신
                    </p>
  
                    <p className="text-[#8b8377]">
                      22분 진행
                    </p>
                  </div>
  
                  <p className="mt-3 text-[18px] leading-[1.8] text-[#5e584f]">
                    시장과 남편 이야기 진행.
                    감정적 보물 2건 감지.
                  </p>
                </div>
              </div>
            </div>
          </section>
  
          {/* 우측 */}
          <aside className="space-y-6">
  
            {/* 위험 알림 */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <h3 className="text-[28px] font-semibold">
                주의 알림
              </h3>
  
              <div className="mt-6 space-y-4">
  
                <div className="rounded-2xl bg-[#fff5f5] p-4">
                  <p className="font-semibold text-[#c15d5d]">
                    감정 피로 감지
                  </p>
  
                  <p className="mt-2 text-[#7d6d6d]">
                    박순례 어르신
                  </p>
                </div>
  
                <div className="rounded-2xl bg-[#f8f5ef] p-4">
                  <p className="font-semibold">
                    금기 주제 접근 주의
                  </p>
  
                  <p className="mt-2 text-[#7d766d]">
                    전쟁 관련 회상
                  </p>
                </div>
              </div>
            </div>
  
            {/* 진행 메모 */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <h3 className="text-[28px] font-semibold">
                오늘 메모
              </h3>
  
              <textarea
                placeholder="운영 메모를 입력하세요."
                className="mt-5 h-44 w-full rounded-2xl border border-[#e5ddd1] bg-[#faf8f4] p-4 text-[18px] outline-none"
              />
  
              <button className="mt-5 h-14 w-full rounded-2xl bg-[#6f9075] text-lg font-semibold text-white">
                저장하기
              </button>
            </div>
  
            {/* 시스템 상태 */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <h3 className="text-[28px] font-semibold">
                시스템 상태
              </h3>
  
              <div className="mt-6 space-y-4">
  
                <div className="flex items-center justify-between rounded-2xl bg-[#f7f4ee] p-4">
                  <p>STT</p>
  
                  <p className="font-semibold text-[#6f9075]">
                    정상
                  </p>
                </div>
  
                <div className="flex items-center justify-between rounded-2xl bg-[#f7f4ee] p-4">
                  <p>AI 질문 생성</p>
  
                  <p className="font-semibold text-[#6f9075]">
                    정상
                  </p>
                </div>
  
                <div className="flex items-center justify-between rounded-2xl bg-[#f7f4ee] p-4">
                  <p>TTS</p>
  
                  <p className="font-semibold text-[#6f9075]">
                    정상
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }
