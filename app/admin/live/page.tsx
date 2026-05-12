"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

    void load();

    // 운영 DB sessions 테이블이 anon SELECT 를 RLS 로 막고 있어 Supabase realtime 채널
    // 은 변경 이벤트를 어드민 클라이언트에 전달하지 못한다. (RLS 통과한 행만 push)
    // 그래서 best-effort realtime + 10초 폴링 백업 둘 다 건다.
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
      window.clearInterval(pollId);
      unsubscribe();
    };
  }, []);

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
          </div>

          <Link
            href="/admin/home"
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold shadow-sm"
          >
            운영 홈으로
          </Link>
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
