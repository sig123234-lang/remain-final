"use client";

import {
  useEffect,
  useMemo,
  Suspense,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import Header from "@/components/talk/Header";
import BottomTab from "@/components/talk/BottomTab";
import {
  getBodyTextClass,
  getQuestionTextClass,
} from "@/lib/preferences";
import { useTalkPreferencesStore } from "@/hooks/usePreferenceStore";

import {
  getElderSessions,
} from "@/services/sessionService";
import { REMAIN_DEFAULT_ELDER_ID } from "@/lib/remain-config";

type Session = {
  id: string;
  started_at: string;
  ended_at?: string | null;
  summary?: string;
  detected_emotion?: string;
  messages?: {
    id: string;
    role: string;
    content: string;
    created_at?: string;
    turn_index?: number;
    sequence_in_turn?: number;
  }[];
};

function RecordsPageBody({
  elderId,
}: {
  elderId: string;
}) {
  const { preferences } =
    useTalkPreferencesStore();
  const [sessions, setSessions] =
    useState<Session[]>([]);
  const [loading, setLoading] =
    useState(true);
  const titleTextClass =
    useMemo(
      () =>
        getQuestionTextClass(
          preferences.fontSize
        ),
      [preferences.fontSize]
    );
  const bodyTextClass =
    useMemo(
      () =>
        getBodyTextClass(
          preferences.fontSize
        ),
      [preferences.fontSize]
    );

  useEffect(() => {
    if (!elderId) {
      return;
    }

    const fetchSessions =
      async () => {
        setLoading(true);

        try {
          const data =
            (await getElderSessions(
              elderId
            )) as Session[] | null;

          setSessions(data || []);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

    void fetchSessions();
  }, [elderId]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        
        <Header subtitle="함께 나눈 이야기들이에요" />

        <main className="flex flex-1 flex-col pt-8">

          {loading && (
            <div className="mt-10 text-center text-[#8a7463]">
              기록을 불러오고 있어요...
            </div>
          )}

          {!loading &&
            sessions.length === 0 && (
              <div className="mt-16 rounded-[28px] bg-white/80 p-8 text-center shadow-sm">
                
                <p className="text-[18px] font-bold">
                  아직 저장된 이야기가 없어요
                </p>

                <p className="mt-3 text-sm text-[#8a7463]">
                  첫 대화를 시작해보세요
                </p>
              </div>
            )}

          <div className="space-y-5">
            {sessions.map((session) => {
              // 메시지를 created_at + turn_index + sequence_in_turn 기준으로
              // 안정 정렬. uuid 기준 정렬은 시간순이 보장되지 않아서, 같은 턴 안에서
              // assistant/user 가 뒤바뀌어 보이는 일이 있었다.
              const orderedMessages =
                (session.messages ?? [])
                  .slice()
                  .sort((left, right) => {
                    const leftTime =
                      left.created_at || "";
                    const rightTime =
                      right.created_at || "";
                    const timeDiff =
                      leftTime.localeCompare(
                        rightTime
                      );
                    if (timeDiff !== 0)
                      return timeDiff;
                    const leftTurn =
                      left.turn_index ?? 0;
                    const rightTurn =
                      right.turn_index ?? 0;
                    if (
                      leftTurn !== rightTurn
                    )
                      return (
                        leftTurn - rightTurn
                      );
                    return (
                      (left.sequence_in_turn ??
                        0) -
                      (right.sequence_in_turn ??
                        0)
                    );
                  });

              return (
                <div
                  key={session.id}
                  className="rounded-[30px] bg-white/88 p-6 shadow-[0_18px_50px_rgba(93,68,42,0.08)] ring-1 ring-white/90"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#8a7463]">
                        {new Date(
                          session.started_at
                        ).toLocaleString()}
                      </p>

                      <h3
                        className={`mt-2 font-black leading-[1.4] ${titleTextClass}`}
                      >
                        함께 나눈 이야기
                      </h3>

                      <p className="mt-1 text-xs text-[#8a7463]">
                        {orderedMessages.length}개의 말씀이 담겨있어요
                      </p>
                    </div>

                    <div className="rounded-full bg-[#edf4ec] px-3 py-1 text-xs font-bold text-[#6f9075]">
                      {session.detected_emotion ||
                        "편안함"}
                    </div>
                  </div>

                  {session.summary && (
                    <div className="mt-5 rounded-[22px] bg-[#faf6ef] p-5">
                      <p className="text-sm font-bold text-[#8a7463]">
                        오늘의 요약
                      </p>
                      <p
                        className={`mt-3 leading-[1.8] text-[#5e5148] ${bodyTextClass}`}
                      >
                        {session.summary}
                      </p>
                    </div>
                  )}

                  {orderedMessages.length > 0 ? (
                    <div className="mt-5 space-y-2">
                      <p className="text-sm font-bold text-[#8a7463]">
                        나눈 이야기
                      </p>
                      <div className="space-y-2 rounded-[22px] bg-[#faf6ef] p-4">
                        {orderedMessages.map(
                          (message) => {
                            const isElder =
                              message.role ===
                              "user";
                            return (
                              <div
                                key={
                                  message.id
                                }
                                className={`flex ${
                                  isElder
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <div
                                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-[1.6] ${
                                    isElder
                                      ? "bg-[#e7eedd] text-[#3d4a35]"
                                      : "bg-white text-[#5e5148] ring-1 ring-white/90"
                                  }`}
                                >
                                  {message.content}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[22px] bg-[#faf6ef] p-5 text-center text-sm text-[#8a7463]">
                      이 세션에는 아직 저장된 대화가 없어요.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}

function RecordsPageContent() {
  const searchParams =
    useSearchParams();
  const elderId =
    searchParams.get("elderId") ??
    REMAIN_DEFAULT_ELDER_ID;

  return (
    <RecordsPageBody elderId={elderId} />
  );
}

export default function RecordsPage() {
  return (
    <Suspense
      fallback={
        <RecordsPageBody
          elderId={
            REMAIN_DEFAULT_ELDER_ID
          }
        />
      }
    >
      <RecordsPageContent />
    </Suspense>
  );
}
