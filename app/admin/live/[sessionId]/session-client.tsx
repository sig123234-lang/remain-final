"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAdminPreferencesStore } from "@/hooks/usePreferenceStore";
import { listEldersByIds } from "@/services/elderService";
import { subscribeToActiveSessions } from "@/services/sessionRealtime";
import {
  endSession,
  listActiveSessions,
  saveSessionSummary,
  updateSessionMode,
} from "@/services/sessionService";
import { useLiveSession } from "@/hooks/useLiveSession";
import type { ElderRecord } from "@/types/elder";
import type {
  SessionMode,
  SessionRecord,
} from "@/types/session";

const ACTIVE_SESSIONS_POLL_INTERVAL_MS =
  10_000;

function upsertSession(
  sessions: SessionRecord[],
  nextSession: SessionRecord
) {
  const existingIndex =
    sessions.findIndex(
      (session) =>
        session.id === nextSession.id
    );

  if (existingIndex >= 0) {
    const nextSessions = [...sessions];
    nextSessions[existingIndex] =
      nextSession;
    return nextSessions;
  }

  return [nextSession, ...sessions];
}

export default function AdminLiveSessionClient({
  sessionId,
}: {
  sessionId: string;
}) {
  const { preferences } =
    useAdminPreferencesStore();
  const {
    snapshot,
    isLoading,
    error,
    hydrate,
    issueCommand,
    sendRecommendation,
    dismissRecommendation,
    saveFacilitatorNote,
  } = useLiveSession(sessionId, {
    enableRealtimeMonitor:
      preferences.realtimeMonitor,
  });
  const [activeSessions, setActiveSessions] =
    useState<SessionRecord[]>([]);
  const [eldersById, setEldersById] =
    useState<Record<string, ElderRecord>>(
      {}
    );
  const [directQuestion, setDirectQuestion] =
    useState("");
  const [noteDraft, setNoteDraft] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  const [isEndingSession, setIsEndingSession] =
    useState(false);
  const [isSwitchingMode, setIsSwitchingMode] =
    useState(false);

  const hydrateActiveSessions =
    useCallback(
      async (
        sessions: SessionRecord[]
      ) => {
        setActiveSessions(sessions);

        const elderIds = [
          ...new Set(
            sessions.map(
              (session) =>
                session.elder_id
            )
          ),
        ];

        if (elderIds.length === 0) {
          return;
        }

        try {
          const elders =
            await listEldersByIds(
              elderIds
            );

          setEldersById(
            elders.reduce<
              Record<string, ElderRecord>
            >((accumulator, elder) => {
              accumulator[elder.id] =
                elder;
              return accumulator;
            }, {})
          );
        } catch {}
      },
      []
    );

  const loadActiveSessions =
    useCallback(async () => {
      const sessions =
        await listActiveSessions();
      await hydrateActiveSessions(
        sessions
      );
    }, [hydrateActiveSessions]);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadActiveSessions();
      }, 0);

    if (!preferences.realtimeMonitor) {
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const pollId = window.setInterval(() => {
      void loadActiveSessions();
    }, ACTIVE_SESSIONS_POLL_INTERVAL_MS);

    const unsubscribe =
      subscribeToActiveSessions(
        (session) => {
          setActiveSessions((previous) => {
            const nextSessions =
              upsertSession(
                previous,
                session
              ).filter(
                (currentSession) =>
                  currentSession.status ===
                  "active"
              );

            void hydrateActiveSessions(
              nextSessions
            );

            return nextSessions;
          });
        }
      );

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      unsubscribe();
    };
  }, [
    hydrateActiveSessions,
    loadActiveSessions,
    preferences.realtimeMonitor,
  ]);

  const currentState = useMemo(
    () => snapshot?.session.current_state,
    [snapshot]
  );

  const selectedElder = useMemo(
    () =>
      snapshot
        ? eldersById[
            snapshot.session.elder_id
          ] ?? null
        : null,
    [eldersById, snapshot]
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

  const latestCommand =
    snapshot?.commands[0] ?? null;
  const currentMode =
    snapshot?.session.mode ?? "collab";
  const isSessionEnded =
    snapshot?.session.status ===
    "ended";
  const sessionMeta = useMemo(() => {
    const parts = [
      selectedElder?.diagnosis ||
        "회상 인터뷰 진행 중",
      selectedElder?.facility_name,
    ].filter(
      (value): value is string =>
        Boolean(value)
    );

    return parts.join(" · ");
  }, [selectedElder]);
  const displayedNoteDraft =
    noteDraft ??
    currentState?.facilitatorNote ??
    "";

  const refreshSessionView =
    useCallback(async () => {
      await Promise.all([
        hydrate({ quiet: true }),
        loadActiveSessions(),
      ]);
    }, [hydrate, loadActiveSessions]);

  const handleModeChange =
    useCallback(
      async (nextMode: SessionMode) => {
        if (
          isSwitchingMode ||
          isEndingSession ||
          isSessionEnded ||
          nextMode === currentMode
        ) {
          return;
        }

        setActionError(null);
        setIsSwitchingMode(true);

        try {
          await updateSessionMode(
            sessionId,
            nextMode
          );
          await refreshSessionView();
        } catch (caughtError) {
          setActionError(
            caughtError instanceof Error
              ? caughtError.message
              : "세션 모드를 바꾸지 못했어요."
          );
        } finally {
          setIsSwitchingMode(false);
        }
      },
      [
        currentMode,
        isEndingSession,
        isSessionEnded,
        isSwitchingMode,
        refreshSessionView,
        sessionId,
      ]
    );

  const handleEndSession =
    useCallback(async () => {
      if (
        isEndingSession ||
        isSessionEnded ||
        !snapshot
      ) {
        return;
      }

      setActionError(null);
      setIsEndingSession(true);

      try {
        if (preferences.autoSummary) {
          await saveSessionSummary({
            sessionId,
            elderId:
              snapshot.session.elder_id,
            summary:
              snapshot.summary?.summary ??
              snapshot.session.summary ??
              snapshot.session.current_state
                ?.sessionSummary,
            familyFriendlySummary:
              snapshot.summary
                ?.family_friendly_summary ??
              snapshot.summary?.summary ??
              snapshot.session.summary ??
              snapshot.session.current_state
                ?.sessionSummary,
            emotions:
              snapshot.session.current_state
                ?.emotionDetected
                ? [
                    snapshot.session.current_state
                      .emotionDetected,
                  ]
                : [],
          });
        }

        await endSession(
          sessionId,
          snapshot.summary?.summary ??
            snapshot.session.summary ??
            snapshot.session.current_state
              ?.sessionSummary,
          snapshot.session.current_state
            ?.emotionDetected ??
            snapshot.session
              .detected_emotion ??
            undefined,
          snapshot.session.current_state ??
            undefined
        );
        await refreshSessionView();
      } catch (caughtError) {
        setActionError(
          caughtError instanceof Error
            ? caughtError.message
            : "세션을 종료하지 못했어요."
        );
      } finally {
        setIsEndingSession(false);
      }
    }, [
      isEndingSession,
      isSessionEnded,
      preferences.autoSummary,
      refreshSessionView,
      sessionId,
      snapshot,
    ]);

  return (
    <div className="min-h-screen bg-[#f5f1ea] p-5 text-[#2d2a26]">
      <div className="mx-auto grid max-w-[1540px] grid-cols-[210px_1fr_420px] gap-5">
        <aside className="flex h-[calc(100vh-112px)] min-h-0 flex-col rounded-3xl bg-[#262b24] p-4 text-white">
          <div className="mb-8">
            <h1 className="text-2xl font-black">
              rem
              <span className="text-[#9fbd9f]">
                AI
              </span>
              n
            </h1>
            <p className="mt-1 text-xs text-white/45">
              회상 인터뷰 운영센터
            </p>
            {!preferences.realtimeMonitor && (
              <p className="mt-3 text-[11px] font-semibold text-[#d5c6a9]">
                수동 모니터 모드
              </p>
            )}
          </div>

          <div className="mb-4 rounded-2xl bg-white/8 p-3">
            <p className="text-xs text-white/55">
              현재 모드
            </p>
            <p className="mt-2 text-sm font-semibold">
              {snapshot?.session.mode ===
              "collab"
                ? "진행자 협업 세션"
                : "자율 세션"}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">
                활성 세션
              </p>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold">
                {activeSessions.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {activeSessions.map(
                (session) => {
                  const elder =
                    eldersById[
                      session.elder_id
                    ];
                  const isSelected =
                    session.id === sessionId;

                  return (
                    <Link
                      key={session.id}
                      href={`/admin/live/${session.id}`}
                      className={`block rounded-2xl px-4 py-3 transition ${
                        isSelected
                          ? "bg-white/16"
                          : "bg-white/6 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {elder
                              ?.display_name ||
                              elder
                                ?.full_name ||
                              "이름 미확인"}
                          </p>
                          <p className="mt-1 text-[11px] text-white/55">
                            {session.current_state
                              ?.action ||
                              "continue"}
                          </p>
                        </div>

                        <span className="rounded-full bg-[#6f9075]/70 px-2 py-1 text-[10px] font-bold">
                          LIVE
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/72">
                        <div className="rounded-xl bg-white/6 px-2 py-2">
                          위험{" "}
                          {session.current_state
                            ?.riskLevel ||
                            "low"}
                        </div>
                        <div className="rounded-xl bg-white/6 px-2 py-2">
                          깊이 L
                          {session.current_state
                            ?.depthLevel ||
                            1}
                        </div>
                      </div>
                    </Link>
                  );
                }
              )}

              {activeSessions.length ===
                0 && (
                <div className="rounded-2xl bg-white/6 px-4 py-4 text-sm text-white/60">
                  아직 진행 중인 세션이 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/8 p-3 text-sm">
            <p className="font-semibold">
              기억을 함께 듣는 관제실
            </p>
            <p className="mt-1 text-xs text-white/50">
              조용한 흐름을 지키면서 필요한 순간에만 개입합니다.
            </p>
          </div>
        </aside>

        <main className="flex h-[calc(100vh-112px)] min-h-0 flex-col rounded-3xl bg-[#fbfaf7] p-5 shadow-sm">
          <section className="mb-5 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-bold">
                {selectedElder
                  ?.display_name ||
                  selectedElder
                    ?.full_name ||
                  "어르신 세션"}{" "}
                <span className="text-base font-normal text-[#7d766d]">
                  {selectedElder?.age
                    ? `${selectedElder.age}세`
                    : "나이 미기록"}{" "}
                  · session{" "}
                  {sessionId.slice(0, 8)}
                </span>
              </h2>
              <p className="mt-1 text-sm text-[#7d766d]">
                {sessionMeta}
              </p>
            </div>

            <div className="mr-6 flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  void refreshSessionView();
                }}
                className="rounded-xl bg-[#f1ede5] px-4 py-3 text-sm font-semibold text-[#6d655c]"
              >
                새로고침
              </button>

              <div className="mr-2 flex rounded-xl bg-[#f1ede5] p-1">
                <button
                  type="button"
                  onClick={() => {
                    void handleModeChange(
                      "collab"
                    );
                  }}
                  disabled={
                    isSwitchingMode ||
                    isEndingSession ||
                    isSessionEnded
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    currentMode ===
                    "collab"
                      ? "bg-[#6f9075] text-white"
                      : "text-[#6d655c] hover:bg-white/60"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  협업
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleModeChange(
                      "auto"
                    );
                  }}
                  disabled={
                    isSwitchingMode ||
                    isEndingSession ||
                    isSessionEnded
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    currentMode ===
                    "auto"
                      ? "bg-[#6f9075] text-white"
                      : "text-[#6d655c] hover:bg-white/60"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  자율
                </button>
              </div>

              <div className="rounded-2xl bg-[#f7f4ee] px-4 py-3 text-right">
                <p className="text-xs text-[#8b8377]">
                  현재 상태
                </p>
                <p className="text-lg font-bold">
                  {currentState?.action ||
                    "continue"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleEndSession();
                }}
                disabled={
                  isEndingSession ||
                  isSessionEnded
                }
                className="rounded-xl bg-[#d96b6b] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEndingSession
                  ? "종료 중..."
                  : isSessionEnded
                    ? "종료됨"
                    : "세션 종료"}
              </button>
            </div>
          </section>

          {actionError && (
            <section className="mb-5 rounded-2xl bg-[#fff2ef] px-5 py-4 text-sm text-[#8a5f57] shadow-sm">
              {actionError}
            </section>
          )}

          <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  실시간 대화 흐름
                </h3>
                <p className="mt-1 text-sm text-[#7d766d]">
                  기억의 결을 따라가며, 필요한 개입은 오른쪽 패널에서 조절합니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-semibold text-[#6f9075]">
                  {snapshot?.session.status ===
                  "active"
                    ? "진행 중"
                    : "종료"}
                </span>
                <span className="rounded-full bg-[#f8f3ea] px-3 py-1.5 text-xs font-semibold text-[#8b8377]">
                  {currentState?.action ||
                    "continue"}
                </span>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-3">
              {[
                [
                  "현재 화자",
                  currentState?.lastSpeaker ||
                    "assistant",
                ],
                [
                  "깊이",
                  `L${currentState?.depthLevel || 1}`,
                ],
                [
                  "위험도",
                  currentState?.riskLevel ||
                    "low",
                ],
                [
                  "감정",
                  currentState?.emotionDetected ||
                    "neutral",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-[#faf8f4] px-4 py-3"
                >
                  <p className="text-xs text-[#8b8377]">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#5f5a53]">
                    {value}
                  </p>
                </div>
              ))}
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

              <div className="space-y-4">
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
                        className="grid grid-cols-[56px_54px_1fr] items-start gap-3 border-b border-[#f0e8dc] pb-4 last:border-b-0"
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
                              : isAdmin
                                ? "bg-[#efe3cf] text-[#8a6748]"
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
                            {
                              message.content
                            }
                          </p>

                          <div className="mt-2 rounded-xl bg-[#faf8f4] px-3 py-2 text-xs leading-5 text-[#736b60]">
                            출처:{" "}
                            {message.source ||
                              "system"}
                            {" · "}
                            위험도:{" "}
                            {message.risk_level ||
                              "none"}
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
                disabled={isSessionEnded}
                placeholder="진행자가 직접 질문을 입력해 개입할 수 있어요."
                className="h-10 flex-1 rounded-xl border border-[#e7dfd3] bg-[#faf8f4] px-3 text-sm outline-none focus:border-[#6f9075] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => {
                  if (
                    !directQuestion.trim() ||
                    isSessionEnded
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
                disabled={isSessionEnded}
                className="rounded-xl bg-[#6f9075] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                질문 보내기
              </button>
            </div>
          </section>
        </main>

        <aside className="flex h-[calc(100vh-112px)] min-h-0 flex-col gap-4 overflow-y-auto">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  AI 추천 질문
                </h3>
                <p className="mt-1 text-xs text-[#7d766d]">
                  의도와 감정 결을 보고 다음 질문을 고릅니다.
                </p>
              </div>

              <span className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-semibold text-[#6f9075]">
                {currentMode === "collab"
                  ? "협업"
                  : "자율"}
              </span>
            </div>

            <div className="space-y-3">
              {sortedRecommendations.map(
                (recommendation, index) => (
                  <div
                    key={recommendation.id}
                    className="rounded-2xl border border-[#ebe4d9] bg-[#faf8f4] p-4 transition hover:border-[#6f9075] hover:bg-[#f3f8f1]"
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

                        <div className="mt-3 grid gap-2 text-xs leading-5">
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
                            disabled={isSessionEnded}
                            className="rounded-xl bg-[#6f9075] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            추천 질문 보내기
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void dismissRecommendation(
                                recommendation.id
                              );
                            }}
                            disabled={isSessionEnded}
                            className="rounded-xl bg-[#f1ede5] px-3 py-2 text-xs font-semibold text-[#6d655c] disabled:cursor-not-allowed disabled:opacity-60"
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
              위험과 흐름
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                [
                  "위험도",
                  currentState?.riskLevel ||
                    "low",
                ],
                [
                  "깊이",
                  `L${currentState?.depthLevel || 1}`,
                ],
                [
                  "현재 액션",
                  currentState?.action ||
                    "continue",
                ],
                [
                  "직전 개입",
                  latestCommand
                    ?.command_type ||
                    "없음",
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
                ["안전 정지", "safety_pause"],
              ].map(([label, command]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (isSessionEnded) {
                      return;
                    }

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
                  disabled={isSessionEnded}
                  className="h-10 rounded-xl bg-[#f7f4ee] text-sm font-semibold transition hover:bg-[#efe9de] disabled:cursor-not-allowed disabled:opacity-60"
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
              value={displayedNoteDraft}
              onChange={(event) => {
                setNoteDraft(
                  event.target.value
                );
              }}
              disabled={isSessionEnded}
              placeholder="지금 이 기억에서 지켜야 할 분위기나 주의할 감정을 적어주세요."
              className="mt-3 h-24 w-full rounded-xl border border-[#e7dfd3] bg-[#faf8f4] p-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => {
                if (
                  !currentState ||
                  isSessionEnded
                ) {
                  return;
                }

                void saveFacilitatorNote(
                  currentState,
                  displayedNoteDraft
                );
              }}
              disabled={isSessionEnded}
              className="mt-3 h-10 w-full rounded-xl bg-[#6f9075] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              메모 저장
            </button>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">
              세션 런타임 상태
            </h3>
            <div className="mt-3 rounded-xl bg-[#faf8f4] p-4 text-xs leading-6 text-[#6d655c]">
              <p>
                person:{" "}
                {currentState?.currentPerson ||
                  "-"}
              </p>
              <p>
                scene:{" "}
                {currentState?.currentScene ||
                  "-"}
              </p>
              <p>
                period:{" "}
                {currentState?.currentLifePeriod ||
                  "-"}
              </p>
              <p>
                topic:{" "}
                {currentState?.currentTopic ||
                  "-"}
              </p>
              <p>
                turn summary:{" "}
                {currentState?.turnSummary ||
                  "-"}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
