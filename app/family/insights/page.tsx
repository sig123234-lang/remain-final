"use client";

import { useEffect, useMemo, useState } from "react";

import FamilyBottomTab from "@/components/family/FamilyBottomTab";
import {
  getRecentSessions,
} from "@/services/sessionService";
import { REMAIN_DEFAULT_ELDER_ID } from "@/lib/remain-config";

type RecentSessionRecord = {
  id: string;
  detected_emotion?: string | null;
  session_summaries?:
    | {
        emotions?: string[] | null;
        keywords?: string[] | null;
      }[]
    | null;
};

export default function FamilyInsightsPage() {
  const [sessions, setSessions] =
    useState<RecentSessionRecord[]>(
      []
    );

  useEffect(() => {
    const load = async () => {
      const data = await getRecentSessions(
        REMAIN_DEFAULT_ELDER_ID
      );

      setSessions(
        (data ?? []) as RecentSessionRecord[]
      );
    };

    void load();
  }, []);

  const emotionSummary = useMemo(() => {
    const counts =
      new Map<string, number>();

    sessions.forEach((session) => {
      const directEmotion =
        session.detected_emotion;

      if (directEmotion) {
        counts.set(
          directEmotion,
          (counts.get(directEmotion) ?? 0) +
            1
        );
      }

      session.session_summaries?.[0]?.emotions?.forEach(
        (emotion) => {
          counts.set(
            emotion,
            (counts.get(emotion) ?? 0) + 1
          );
        }
      );
    });

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4);
  }, [sessions]);

  const keywordSummary = useMemo(() => {
    const counts =
      new Map<string, number>();

    sessions.forEach((session) => {
      session.session_summaries?.[0]?.keywords?.forEach(
        (keyword) => {
          counts.set(
            keyword,
            (counts.get(keyword) ?? 0) + 1
          );
        }
      );
    });

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [sessions]);

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
              최근 대화의 마음 흐름이에요
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff8ef]/92 text-xl shadow-sm ring-1 ring-white/90">
            💛
          </div>
        </header>

        <main className="mt-6 flex flex-1 flex-col gap-4">
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <h2 className="text-[22px] font-black">
              자주 감지된 감정
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {(emotionSummary.length > 0
                ? emotionSummary
                : [["아직 없음", 0]]
              ).map(([emotion, count]) => (
                <div
                  key={emotion}
                  className="rounded-[24px] bg-[#f8f3ea] px-4 py-5"
                >
                  <p className="text-sm text-[#8a7463]">
                    감정
                  </p>
                  <p className="mt-2 text-[18px] font-black">
                    {emotion}
                  </p>
                  <p className="mt-1 text-sm text-[#8a7463]">
                    {count}회
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <h2 className="text-[22px] font-black">
              자주 나온 기억 단서
            </h2>

            <div className="mt-5 flex flex-wrap gap-3">
              {(keywordSummary.length > 0
                ? keywordSummary
                : [["아직 없음", 0]]
              ).map(([keyword, count]) => (
                <div
                  key={keyword}
                  className="rounded-full bg-[#f6efe4] px-4 py-3 text-[15px] font-bold text-[#6f5d50]"
                >
                  #{keyword} · {count}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <FamilyBottomTab />
    </div>
  );
}
