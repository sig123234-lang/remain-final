"use client";

import { useState } from "react";

const recommendedQuestions = [
  {
    question: "그 떡국은 주로 누가 만들어주셨어요?",
    intent: "음식 → 가족 인물",
    memory: "떡국 · 어머니",
    emotion: "안정감",
  },
  {
    question: "그때 같이 밥 먹던 사람이 떠오르세요?",
    intent: "식사 장면 → 관계",
    memory: "가족 식사",
    emotion: "연결감",
  },
  {
    question: "겨울 아침 집 안 분위기가 기억나세요?",
    intent: "감각 → 공간 회상",
    memory: "겨울 아침 · 집",
    emotion: "편안함",
  },
];

const messages = [
  {
    role: "ai",
    time: "14:02",
    text: "초등학교 다니실 때 겨울 되면 자주 먹던 음식 기억나세요?",
    note: "구체적 시기와 음식 단서로 회상 진입.",
  },
  {
    role: "elderly",
    time: "14:03",
    text: "음... 떡국 많이 먹었지. 엄마가 겨울만 되면 꼭 끓여줬어.",
    note: "어머니, 겨울, 음식 기억 등장. 가족 연결 가능.",
  },
];

export default function LiveSessionPage() {
  const [mode, setMode] = useState<"collab" | "auto">("collab");

  return (
    <div className="min-h-screen bg-[#f5f1ea] p-5 text-[#2d2a26]">
      <div className="mx-auto grid max-w-[1540px] grid-cols-[190px_1fr_420px] gap-5">
        {/* 좌측 메뉴 */}
        <aside className="flex h-[calc(100vh-40px)] flex-col rounded-3xl bg-[#262b24] p-4 text-white">
          <div className="mb-8">
            <h1 className="text-2xl font-black">
              rem<span className="text-[#9fbd9f]">AI</span>n
            </h1>
            <p className="mt-1 text-xs text-white/45">
              회상 대화 운영 시스템
            </p>
          </div>

          <nav className="space-y-2 text-sm">
            {[
              "진행 세션",
              "어르신 관리",
              "세션 기록",
              "기억 아카이브",
              "보호자 리포트",
              "운영 설정",
            ].map((item, idx) => (
              <button
                key={item}
                className={`w-full rounded-xl px-4 py-3 text-left ${
                  idx === 0 ? "bg-white/12" : "hover:bg-white/8"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-white/8 p-3 text-sm">
            <p className="font-semibold">행복요양원</p>
            <p className="mt-1 text-xs text-white/50">보조 진행자 계정</p>
          </div>
        </aside>

        {/* 중앙: 실시간 대화 중심 */}
        <main className="flex h-[calc(100vh-40px)] min-h-0 flex-col rounded-3xl bg-[#fbfaf7] p-5 shadow-sm">
          {/* 상단 정보 */}
          <section className="mb-5 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-bold">
                김영자 어르신{" "}
                <span className="text-base font-normal text-[#7d766d]">
                  84세 · 2회차
                </span>
              </h2>
              <p className="mt-1 text-sm text-[#7d766d]">
                오늘의 세션 · 2026.05.08 오후 2:00 · 경도 인지장애
              </p>
            </div>

            <div className="mr-6 flex items-center gap-4">
            <div className="mr-2 flex rounded-xl bg-[#f1ede5] p-1">
  <button
    onClick={() => setMode("collab")}
    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      mode === "collab"
        ? "bg-[#6f9075] text-white"
        : "text-[#6d655c]"
    }`}
  >
    협업
  </button>

  <button
    onClick={() => setMode("auto")}
    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      mode === "auto"
        ? "bg-[#6f9075] text-white"
        : "text-[#6d655c]"
    }`}
  >
    자율
  </button>
</div>

              <div className="rounded-2xl bg-[#f7f4ee] px-4 py-3 text-right">
                <p className="text-xs text-[#8b8377]">진행 시간</p>
                <p className="text-lg font-bold">00:18:42</p>
              </div>

              <button className="rounded-xl bg-[#d96b6b] px-4 py-3 text-sm font-semibold text-white">
                세션 종료
              </button>
            </div>
          </section>

          {/* 대화 흐름 */}
          <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">실시간 대화 흐름</h3>
                <p className="mt-1 text-sm text-[#7d766d]">
                  대화 흐름을 보면서 오른쪽에서 다음 질문을 선택합니다.
                </p>
              </div>

              <span className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-semibold text-[#6f9075]">
                듣는 중
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
              <div className="space-y-3">
                {messages.map((message, idx) => {
                  const isAI = message.role === "ai";

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-[56px_54px_1fr] items-start gap-3 border-b border-[#f0e8dc] pb-4 last:border-b-0"
                    >
                      <p className="pt-1 text-xs text-[#8b8377]">
                        {message.time}
                      </p>

                      <span
                        className={`rounded-lg px-2 py-1 text-center text-xs font-semibold ${
                          isAI
                            ? "bg-[#dfe8d7] text-[#587057]"
                            : "bg-[#ece3d2] text-[#7a6854]"
                        }`}
                      >
                        {isAI ? "질문" : "답변"}
                      </span>

                      <div>
                        <p className="text-[15px] leading-7">{message.text}</p>

                        <div className="mt-2 rounded-xl bg-[#faf8f4] px-3 py-2 text-xs leading-5 text-[#736b60]">
                          AI 메모: {message.note}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-t border-[#f0e8dc] pt-4">
              <input
                placeholder="STT 결과 또는 어르신 답변을 입력하세요."
                className="h-10 flex-1 rounded-xl border border-[#e7dfd3] bg-[#faf8f4] px-3 text-sm outline-none focus:border-[#6f9075]"
              />
              <button className="rounded-xl bg-[#6f9075] px-4 text-sm font-semibold text-white">
                답변 추가
              </button>
            </div>
          </section>
        </main>

        {/* 우측: 추천 질문 + 운영 패널 */}
        <aside className="flex h-[calc(100vh-40px)] min-h-0 flex-col gap-4 overflow-y-auto">
          {/* 추천 질문 */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">AI 추천 질문</h3>
                <p className="mt-1 text-xs text-[#7d766d]">
                  의도 확인 후 선택
                </p>
              </div>

              <span className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-semibold text-[#6f9075]">
                {mode === "collab" ? "협업" : "자율"}
              </span>
            </div>

            <div className="space-y-3">
              {recommendedQuestions.map((item, idx) => (
                <button
                  key={item.question}
                  className="w-full rounded-2xl border border-[#ebe4d9] bg-[#faf8f4] p-4 text-left transition hover:border-[#6f9075] hover:bg-[#f3f8f1]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d9d2c7] text-xs font-bold text-[#5f594f]">
                      {idx + 1}
                    </div>

                    <div>
                      <p className="text-[15px] font-semibold leading-6">
                        {item.question}
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs leading-5">
                        <div className="rounded-xl bg-[#f0e9dc] px-3 py-2">
                          <span className="font-bold">의도 </span>
                          {item.intent}
                        </div>

                        <div className="rounded-xl bg-[#edf4ec] px-3 py-2 text-[#5f7d65]">
                          <span className="font-bold">기억 </span>
                          {item.memory}
                        </div>

                        <div className="rounded-xl bg-white px-3 py-2">
                          <span className="font-bold">감정 </span>
                          {item.emotion}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                placeholder="직접 질문 입력"
                className="h-10 min-w-0 flex-1 rounded-xl border border-[#e7dfd3] bg-[#faf8f4] px-3 text-sm outline-none focus:border-[#6f9075]"
              />
              <button className="rounded-xl bg-[#6f9075] px-3 text-sm font-semibold text-white">
                보내기
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">이전 회차 연결</h3>
            <p className="mt-3 text-sm leading-6 text-[#5f5a53]">
              지난 시간에는 아버지 고깃집과 겨울 장사 이야기가 나왔습니다.
              오늘은 음식 기억에서 가족 식사 장면으로 연결하기 좋습니다.
            </p>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">현재 상태</h3>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["감정", "안정적"],
                ["위험", "없음"],
                ["흐름", "음식→가족"],
                ["보물", "대기"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#f7f4ee] p-3">
                  <p className="text-xs text-[#8b8377]">{label}</p>
                  <p className="mt-1 text-sm font-bold text-[#6f9075]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">개입 버튼</h3>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {["더 깊게", "가볍게", "금기 등록", "관리사 권유"].map(
                (item) => (
                  <button
                    key={item}
                    className="h-10 rounded-xl bg-[#f7f4ee] text-sm font-semibold"
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">학습 포인트</h3>
            <p className="mt-3 text-sm leading-6">
              관리자가 선택한 질문과 수정한 질문은 이후 자율 진행 품질 개선에
              반영됩니다.
            </p>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">진행 메모</h3>
            <textarea
              placeholder="메모를 입력하세요."
              className="mt-3 h-24 w-full rounded-xl border border-[#e7dfd3] bg-[#faf8f4] p-3 text-sm outline-none"
            />
            <button className="mt-3 h-10 w-full rounded-xl bg-[#6f9075] text-sm font-semibold text-white">
              저장하기
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}