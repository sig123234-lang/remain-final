"use client";

import { useEffect, useState } from "react";

import { listSessions } from "@/services/sessionService";
import type { SessionRecord } from "@/types/session";

export default function AdminReportsPage() {
  const [sessions, setSessions] =
    useState<SessionRecord[]>([]);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data =
          await listSessions();
        setSessions(
          data.filter(
            (session) =>
              session.status === "ended"
          )
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "세션 리포트를 불러오지 못했어요."
        );
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-black tracking-tight">
          세션 리포트
        </h1>
        <p className="mt-2 text-[#6f5d50]">
          종료된 세션의 요약과 상태를 확인합니다.
        </p>

        {error && (
          <div className="mt-6 rounded-3xl bg-[#fff3ef] p-5 text-sm text-[#8a5f57] shadow-sm">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-[28px] bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-[#8a7463]">
                  session {session.id.slice(0, 8)}
                </p>
                <span className="rounded-full bg-[#edf4ec] px-3 py-1 text-xs font-bold text-[#6f9075]">
                  {session.detected_emotion ||
                    "neutral"}
                </span>
              </div>

              <p className="mt-3 text-lg leading-8 text-[#5f5a53]">
                {session.summary ||
                  "요약이 아직 저장되지 않았습니다."}
              </p>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              아직 리포트 가능한 종료 세션이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
