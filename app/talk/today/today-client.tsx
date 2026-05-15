"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import BottomTab from "@/components/talk/BottomTab";
import Header from "@/components/talk/Header";
import {
  getBodyTextClass,
  getQuestionTextClass,
} from "@/lib/preferences";
import { useTalkPreferencesStore } from "@/hooks/usePreferenceStore";
import {
  getRecentSessions,
} from "@/services/sessionService";

type RecentSessionRecord = {
  id: string;
  started_at: string;
  detected_emotion?: string | null;
  summary?: string | null;
  session_summaries?:
    | {
        family_friendly_summary?: string | null;
        keywords?: string[] | null;
        emotions?: string[] | null;
      }[]
    | null;
};

function formatLastSessionLabel(
  session?: RecentSessionRecord
) {
  if (!session?.started_at) {
    return "아직 기록 없음";
  }

  return new Date(
    session.started_at
  ).toLocaleString("ko-KR");
}

function pickEmotionEmoji(
  label: string
) {
  if (
    label === "nostalgic" ||
    label === "그리움"
  ) {
    return "🌙";
  }

  if (
    label === "positive" ||
    label === "편안" ||
    label === "안정"
  ) {
    return "☀️";
  }

  if (
    label === "sad" ||
    label === "걱정"
  ) {
    return "💧";
  }

  return "🌿";
}

export default function TodayClientPage({
  elderId,
  elderName,
}: {
  elderId?: string;
  elderName: string;
}) {
  const { preferences } =
    useTalkPreferencesStore();
  const [sessions, setSessions] =
    useState<RecentSessionRecord[]>(
      []
    );
  const deferredSessions =
    useDeferredValue(sessions);

  useEffect(() => {
    if (!elderId) {
      return;
    }

    const load = async () => {
      try {
        const recentSessions =
          await getRecentSessions(
            elderId
          );

        setSessions(
          (recentSessions ??
            []) as RecentSessionRecord[]
        );
      } catch {
        setSessions([]);
      }
    };

    void load();
  }, [elderId]);

  const latestSession =
    elderId
      ? deferredSessions[0]
      : undefined;
  const latestSummary =
    latestSession?.session_summaries?.[0]
      ?.family_friendly_summary ||
    latestSession?.summary ||
    "최근 대화가 아직 정리되지 않았어요.";
  const memories = useMemo(() => {
    const keywords =
      latestSession?.session_summaries?.[0]
        ?.keywords ?? [];

    return keywords.slice(0, 4);
  }, [latestSession]);
  const emotions = useMemo(() => {
    const emotionLabels =
      latestSession?.session_summaries?.[0]
        ?.emotions?.slice(0, 3) ??
      (latestSession?.detected_emotion
        ? [latestSession.detected_emotion]
        : []);

    return emotionLabels.map(
      (label) => ({
        label,
        emoji:
          pickEmotionEmoji(label),
      })
    );
  }, [latestSession]);
  const headingClass =
    getQuestionTextClass(
      preferences.fontSize
    );
  const bodyTextClass =
    getBodyTextClass(
      preferences.fontSize
    );
  const storyHref = elderId
    ? `/talk/story?elderId=${elderId}`
    : "/talk/story";

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        <Header subtitle="오늘도 편안한 시간을 이어가고 있어요" />

        <main className="mt-6 flex flex-1 flex-col gap-4">
          <section className="rounded-[34px] bg-[#fffaf2]/92 p-6 shadow-[0_22px_60px_rgba(93,68,42,0.12)] ring-1 ring-white/90">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex rounded-full bg-[#f2eadf] px-4 py-2 text-sm font-bold text-[#8a715c]">
                  오늘 상태
                </div>

                <h2
                  className={`mt-5 font-black leading-[1.4] tracking-tight ${headingClass}`}
                >
                  {elderName}은
                  <br />
                  오늘도 편안하게
                  <br />
                  이야기를 이어가고 있어요
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#edf4ec] text-2xl">
                🌿
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f8f3ea] p-4">
                <p className="text-sm text-[#8a7463]">
                  마지막 대화
                </p>

                <p className="mt-2 text-lg font-black">
                  {formatLastSessionLabel(
                    latestSession
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8f3ea] p-4">
                <p className="text-sm text-[#8a7463]">
                  오늘 기분
                </p>

                <p className="mt-2 text-lg font-black">
                  {latestSession
                    ?.detected_emotion ||
                    "안정적"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[22px] font-black">
                  최근 자주 나온 기억
                </h3>

                <p className="mt-1 text-sm text-[#8a7463]">
                  최근 대화 속 이야기들이에요
                </p>
              </div>

              <div className="text-2xl">
                ✨
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {(memories.length > 0
                ? memories
                : ["아직 기록 없음"]
              ).map((memory) => (
                <div
                  key={memory}
                  className="rounded-full bg-[#f6efe4] px-4 py-3 text-[15px] font-bold text-[#6f5d50]"
                >
                  #{memory}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[22px] font-black">
                  최근 이야기
                </h3>

                <p className="mt-1 text-sm text-[#8a7463]">
                  오늘 나눈 대화를 정리했어요
                </p>
              </div>

              <div className="text-2xl">
                📖
              </div>
            </div>

            <div className="mt-5 rounded-[26px] bg-[#f8f3ea] p-5">
              <p
                className={`leading-[1.9] text-[#6f5d50] ${bodyTextClass}`}
              >
                {latestSummary}
              </p>
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[22px] font-black">
                  최근 감정 흐름
                </h3>

                <p className="mt-1 text-sm text-[#8a7463]">
                  대화 속에서 느껴진 감정이에요
                </p>
              </div>

              <div className="text-2xl">
                🌙
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              {(emotions.length > 0
                ? emotions
                : [
                    {
                      label: "안정",
                      emoji: "🌿",
                    },
                  ]
              ).map((emotion) => (
                <div
                  key={emotion.label}
                  className="flex flex-1 flex-col items-center rounded-[24px] bg-[#f8f3ea] px-3 py-4"
                >
                  <div className="text-3xl">
                    {emotion.emoji}
                  </div>

                  <p className="mt-2 text-[15px] font-bold text-[#6f5d50]">
                    {emotion.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <a
            href={storyHref}
            className="mt-2 flex h-20 items-center justify-center rounded-[34px] bg-[#8ba77c] text-[22px] font-black text-white shadow-[0_18px_42px_rgba(99,125,86,0.3)]"
          >
            오늘 이야기 시작하기
          </a>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}
