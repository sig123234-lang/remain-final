"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAdminPreferencesStore } from "@/hooks/usePreferenceStore";
import { listActiveSessions } from "@/services/sessionService";
import { subscribeToActiveSessions } from "@/services/sessionRealtime";
import type { SessionRecord } from "@/types/session";

const POLL_INTERVAL_MS = 10_000;

function upsertSession(
  sessions: SessionRecord[],
  nextSession: SessionRecord
) {
  const existingIndex = sessions.findIndex(
    (session) => session.id === nextSession.id
  );

  if (existingIndex >= 0) {
    const nextSessions = [...sessions];
    nextSessions[existingIndex] = nextSession;
    return nextSessions;
  }

  return [nextSession, ...sessions];
}

export default function AdminLivePage() {
  const { preferences } =
    useAdminPreferencesStore();
  const [sessions, setSessions] = useState<
    SessionRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listActiveSessions();
        if (cancelled) return;
        setSessions(data);
        setError(null);
      } catch (caughtError) {
        if (cancelled) return;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "진행 세션을 불러오지 못했어요."
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const timeoutId =
      window.setTimeout(() => {
        void load();
      }, 0);

    if (!preferences.realtimeMonitor) {
      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
      };
    }

    const pollId = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    const unsubscribe = subscribeToActiveSessions(
      (session) => {
        if (cancelled) return;
        setSessions((previous) =>
          upsertSession(
            previous,
            session
          ).filter(
            (currentSession) =>
              currentSession.status === "active"
          )
        );
      }
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      unsubscribe();
    };
  }, [preferences.realtimeMonitor]);

  return (
    <div className="min-h-screen bg-[#f7f4ee] p-6 text-[#2d2a26]">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              실시간 협업 세션
            </h1>
            <p className="mt-2 text-[#6f5d50]">
              어르신 대화와 진행자 개입을 같은 세션 단위로 운영합니다.
            </p>
            {!preferences.realtimeMonitor && (
              <p className="mt-2 text-sm font-semibold text-[#8a715c]">
                운영 설정에서 실시간 모니터가 꺼져 있어 현재 화면은 자동 갱신되지 않습니다.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                void listActiveSessions()
                  .then((data) => {
                    setSessions(data);
                    setError(null);
                  })
                  .catch((caughtError) => {
                    setError(
                      caughtError instanceof
                        Error
                        ? caughtError.message
                        : "진행 세션을 불러오지 못했어요."
                    );
                  })
                  .finally(() => {
                    setIsLoading(false);
                  });
              }}
              className="rounded-2xl bg-[#edf4ec] px-5 py-3 text-sm font-semibold text-[#5f7b62] shadow-sm"
            >
              새로고침
            </button>
            <Link
              href="/admin/home"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold shadow-sm"
            >
              운영 홈으로
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-3xl bg-[#fff3ef] p-5 text-sm text-[#8a5f57] shadow-sm">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {isLoading && (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              진행 세션을 불러오고 있어요.
            </div>
          )}

          {!isLoading &&
            sessions.length === 0 && (
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                현재 진행 중인 세션이 없습니다.
              </div>
            )}

          {sessions.map((session) => {
            const currentState =
              session.current_state;

            return (
              <Link
                key={session.id}
                href={`/admin/live/${session.id}`}
                className="rounded-[28px] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#8a7463]">
                      session {session.id.slice(0, 8)}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      실시간 회상 인터뷰
                    </h2>
                  </div>

                  <span className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-bold text-[#6f9075]">
                    {session.mode ===
                    "collab"
                      ? "협업"
                      : "자율"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#f8f3ea] p-4">
                    <p className="text-xs text-[#8a7463]">
                      현재 액션
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      {currentState?.action ||
                        "continue"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f8f3ea] p-4">
                    <p className="text-xs text-[#8a7463]">
                      깊이 / 위험
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      L
                      {currentState?.depthLevel ||
                        1}{" "}
                      /{" "}
                      {currentState?.riskLevel ||
                        "low"}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-[#6f5d50]">
                  {currentState?.currentQuestion ||
                    "대화 준비 중입니다."}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
