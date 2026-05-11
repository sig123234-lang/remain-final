"use client";

import { useMemo, useState } from "react";

import { useLiveSession } from "@/hooks/useLiveSession";

export default function AdminLiveSessionClient({
  sessionId,
}: {
  sessionId: string;
}) {
  const {
    snapshot,
    isLoading,
    error,
    issueCommand,
    sendRecommendation,
    dismissRecommendation,
    saveFacilitatorNote,
  } = useLiveSession(sessionId);
  const [directQuestion, setDirectQuestion] =
    useState("");
  const [noteDraft, setNoteDraft] =
    useState("");

  const currentState = useMemo(
    () => snapshot?.session.current_state,
    [snapshot]
  );

  const sortedRecommendations =
    snapshot?.recommendations
      .filter(
        (recommendation) =>
          recommendation.status ===
          "suggested"
      )
      .sort((left, right) => {
        const leftRank =
          left.rank ?? 999;
        const rightRank =
          right.rank ?? 999;
        return leftRank - rightRank;
      }) ?? [];

  return (
    <div className="min-h-screen bg-[#f5f1ea] p-5 text-[#2d2a26]">
      <div className="mx-auto grid max-w-[1540px] grid-cols-[1fr_420px] gap-5">
        <main className="flex h-[calc(100vh-72px)] min-h-0 flex-col rounded-3xl bg-[#fbfaf7] p-5 shadow-sm">
          <section className="mb-5 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-bold">
                실시간 회상 세션
              </h2>
              <p className="mt-1 text-sm text-[#7d766d]">
                session {sessionId}
              </p>
            </div>

            <div className="mr-6 flex items-center gap-4">
              <div className="rounded-2xl bg-[#f7f4ee] px-4 py-3 text-right">
                <p className="text-xs text-[#8b8377]">
                  현재 액션
                </p>
                <p className="text-lg font-bold">
                  {currentState?.action ||
                    "continue"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void issueCommand(
                    "end_session"
                  );
                }}
                className="rounded-xl bg-[#d96b6b] px-4 py-3 text-sm font-semibold text-white"
              >
                세션 종료
              </button>
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  실시간 대화 흐름
                </h3>
                <p className="mt-1 text-sm text-[#7d766d]">
                  어르신과 AI가 공유하는 세션 로그입니다.
                </p>
              </div>

              <span className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-semibold text-[#6f9075]">
                {snapshot?.session.status ===
                "active"
                  ? "진행 중"
                  : "종료"}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
              {isLoading && (
                <div className="text-sm text-[#7d766d]">
                  세션을 불러오고 있어요.
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-[#fff2ef] p-4 text-sm text-[#8a5f57]">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {snapshot?.messages.map(
                  (message) => {
                    const isAI =
                      message.role ===
                      "assistant";
                    const isAdmin =
                      message.source ===
                      "facilitator";

                    return (
                      <div
                        key={message.id}
                        className="grid grid-cols-[72px_64px_1fr] items-start gap-3 border-b border-[#f0e8dc] pb-4 last:border-b-0"
                      >
                        <p className="pt-1 text-xs text-[#8b8377]">
                          {new Date(
                            message.created_at
                          ).toLocaleTimeString(
                            "ko-KR",
                            {
                              hour: "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}
                        </p>

                        <span
                          className={`rounded-lg px-2 py-1 text-center text-xs font-semibold ${
                            isAI
                              ? "bg-[#dfe8d7] text-[#587057]"
                              : "bg-[#ece3d2] text-[#7a6854]"
                          }`}
                        >
                          {isAdmin
                            ? "개입"
                            : isAI
                              ? "질문"
                              : "답변"}
                        </span>

                        <div>
                          <p className="text-[15px] leading-7">
                            {message.content}
                          </p>

                          <div className="mt-2 rounded-xl bg-[#faf8f4] px-3 py-2 text-xs leading-5 text-[#736b60]">
                            위험도:{" "}
                            {message.risk_level ||
                              "none"}{" "}
                            · 출처:{" "}
                            {message.source ||
                              "system"}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-t border-[#f0e8dc] pt-4">
              <input
                value={directQuestion}
                onChange={(event) => {
                  setDirectQuestion(
                    event.target.value
                  );
                }}
                placeholder="직접 질문 입력"
                className="h-10 flex-1 rounded-xl border border-[#e7dfd3] bg-[#faf8f4] px-3 text-sm outline-none focus:border-[#6f9075]"
              />
              <button
                type="button"
                onClick={() => {
                  if (
                    !directQuestion.trim()
                  ) {
                    return;
                  }

                  void issueCommand("ask", {
                    questionText:
                      directQuestion.trim(),
                    note: "진행자 직접 개입 질문",
                  });
                  setDirectQuestion("");
                }}
                className="rounded-xl bg-[#6f9075] px-4 text-sm font-semibold text-white"
              >
                개입하기
              </button>
            </div>
          </section>
        </main>

        <aside className="flex h-[calc(100vh-72px)] min-h-0 flex-col gap-4 overflow-y-auto">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  AI 추천 질문
                </h3>
                <p className="mt-1 text-xs text-[#7d766d]">
                  의도 확인 후 바로 개입할 수 있어요
                </p>
              </div>

              <span className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-semibold text-[#6f9075]">
                {snapshot?.session.mode ===
                "collab"
                  ? "협업"
                  : "자율"}
              </span>
            </div>

            <div className="space-y-3">
              {sortedRecommendations.map(
                (recommendation, index) => (
                  <div
                    key={recommendation.id}
                    className="rounded-2xl border border-[#ebe4d9] bg-[#faf8f4] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d9d2c7] text-xs font-bold text-[#5f594f]">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-6">
                          {
                            recommendation.question_text
                          }
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs leading-5">
                          <div className="rounded-xl bg-[#f0e9dc] px-3 py-2">
                            <span className="font-bold">
                              의도{" "}
                            </span>
                            {
                              recommendation.rationale
                            }
                          </div>

                          <div className="rounded-xl bg-[#edf4ec] px-3 py-2 text-[#5f7d65]">
                            <span className="font-bold">
                              기억{" "}
                            </span>
                            {
                              recommendation.target_memory
                            }
                          </div>

                          <div className="rounded-xl bg-white px-3 py-2">
                            <span className="font-bold">
                              감정 / 깊이{" "}
                            </span>
                            {
                              recommendation.target_emotion
                            }{" "}
                            · L
                            {
                              recommendation.target_depth
                            }
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void sendRecommendation(
                                recommendation
                              );
                            }}
                            className="rounded-xl bg-[#6f9075] px-3 py-2 text-xs font-semibold text-white"
                          >
                            질문 보내기
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void dismissRecommendation(
                                recommendation.id
                              );
                            }}
                            className="rounded-xl bg-[#f1ede5] px-3 py-2 text-xs font-semibold text-[#6d655c]"
                          >
                            제외
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

              {sortedRecommendations.length ===
                0 && (
                <div className="rounded-2xl bg-[#faf8f4] p-4 text-sm text-[#7d766d]">
                  아직 생성된 추천 질문이 없습니다.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">
              현재 상태
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                [
                  "감정",
                  currentState?.emotionDetected ||
                    "neutral",
                ],
                [
                  "위험",
                  currentState?.riskLevel ||
                    "low",
                ],
                [
                  "흐름",
                  currentState?.currentTopic ||
                    "대화 진행 중",
                ],
                [
                  "깊이",
                  `L${currentState?.depthLevel || 1}`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#f7f4ee] p-3"
                >
                  <p className="text-xs text-[#8b8377]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#6f9075]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {currentState?.facilitatorNote && (
              <div className="mt-4 rounded-xl bg-[#faf8f4] p-4 text-sm leading-6 text-[#5f5a53]">
                {currentState.facilitatorNote}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">
              개입 버튼
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["더 깊게", "deepen"],
                ["가볍게", "soften"],
                ["주제 전환", "switch_topic"],
                ["안전 일시정지", "safety_pause"],
              ].map(([label, command]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    void issueCommand(
                      command as
                        | "deepen"
                        | "soften"
                        | "switch_topic"
                        | "safety_pause",
                      {
                        note: `${label} 개입`,
                      }
                    );
                  }}
                  className="h-10 rounded-xl bg-[#f7f4ee] text-sm font-semibold"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">
              진행 메모
            </h3>
            <textarea
              value={noteDraft}
              onChange={(event) => {
                setNoteDraft(
                  event.target.value
                );
              }}
              placeholder="메모를 입력하세요."
              className="mt-3 h-24 w-full rounded-xl border border-[#e7dfd3] bg-[#faf8f4] p-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!currentState) {
                  return;
                }

                void saveFacilitatorNote(
                  currentState,
                  noteDraft
                );
              }}
              className="mt-3 h-10 w-full rounded-xl bg-[#6f9075] text-sm font-semibold text-white"
            >
              저장하기
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
