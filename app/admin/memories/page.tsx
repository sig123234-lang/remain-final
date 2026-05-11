"use client";

import { useEffect, useState } from "react";

import { listSessions } from "@/services/sessionService";
import type { SessionRecord } from "@/types/session";

export default function AdminMemoriesPage() {
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
              Boolean(session.summary)
          )
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "기억 아카이브를 불러오지 못했어요."
        );
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-black tracking-tight">
          기억 아카이브
        </h1>
        <p className="mt-2 text-[#6f5d50]">
          세션 요약이 저장된 기억 조각들을 확인합니다.
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
              <p className="text-sm text-[#8a7463]">
                session {session.id.slice(0, 8)}
              </p>
              <p className="mt-3 text-lg leading-8 text-[#5f5a53]">
                {session.summary}
              </p>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              아직 저장된 기억 아카이브가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
