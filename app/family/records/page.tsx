"use client";

import { useEffect, useState } from "react";

import FamilyBottomTab from "@/components/family/FamilyBottomTab";
import {
  getRecentSessions,
} from "@/services/sessionService";
import { REMAIN_DEFAULT_ELDER_ID } from "@/lib/remain-config";

type RecentSessionRecord = {
  id: string;
  started_at: string;
  summary?: string | null;
  session_summaries?:
    | {
        family_friendly_summary?: string | null;
        keywords?: string[] | null;
      }[]
    | null;
};

function getFamilySummary(
  session: RecentSessionRecord
) {
  const summaryRecord =
    session.session_summaries?.[0];

  return (
    summaryRecord
      ?.family_friendly_summary ||
    session.summary ||
    "아직 정리된 가족용 요약이 없습니다."
  );
}

export default function FamilyRecordsPage() {
  const [sessions, setSessions] =
    useState<RecentSessionRecord[]>(
      []
    );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data =
          await getRecentSessions(
            REMAIN_DEFAULT_ELDER_ID
          );

        setSessions(
          (data ?? []) as RecentSessionRecord[]
        );
        setError(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "기록을 불러오지 못했어요."
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-[34px] font-black tracking-tight">
              rem
              <span className="text-[#7f9f72]">
                AI
              </span>
              n
            </h1>
            <p className="mt-1 text-sm text-[#8a7463]">
              가족과 나눌 수 있는 기록이에요
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff8ef]/92 text-xl shadow-sm ring-1 ring-white/90">
            📖
          </div>
        </header>

        <main className="mt-6 flex flex-1 flex-col gap-4">
          {loading && (
            <section className="rounded-[30px] bg-white/88 p-6 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
              기록을 불러오고 있어요.
            </section>
          )}

          {error && (
            <section className="rounded-[30px] bg-[#fff3ef] p-6 text-sm text-[#8a5f57] shadow-sm">
              {error}
            </section>
          )}

          {!loading &&
            !error &&
            sessions.length === 0 && (
              <section className="rounded-[30px] bg-white/88 p-6 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
                아직 공유할 기록이 없습니다.
              </section>
            )}

          {sessions.map((session) => (
            <section
              key={session.id}
              className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90"
            >
              <p className="text-sm text-[#8a7463]">
                {new Date(
                  session.started_at
                ).toLocaleDateString("ko-KR")}
              </p>

              <div className="mt-4 rounded-[24px] bg-[#f8f3ea] p-5">
                <p className="text-sm font-bold text-[#8a7463]">
                  가족용 정리
                </p>

                <p className="mt-3 text-[17px] leading-[1.85] text-[#5e5148]">
                  {getFamilySummary(session)}
                </p>
              </div>

              {(session.session_summaries?.[0]
                ?.keywords?.length ?? 0) >
                0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {session.session_summaries?.[0]?.keywords?.map(
                    (keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-[#edf4ec] px-3 py-1 text-sm text-[#6f9075]"
                      >
                        #{keyword}
                      </span>
                    )
                  )}
                </div>
              )}
            </section>
          ))}
        </main>
      </div>

      <FamilyBottomTab />
    </div>
  );
}
