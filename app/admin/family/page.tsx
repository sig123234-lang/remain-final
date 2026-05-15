"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatAdminDate,
  getElderLabel,
  getFamilySummaryText,
  getSessionTagList,
} from "@/lib/admin-session-utils";
import {
  patchFamilyPreferences,
  useFamilyPreferencesStore,
} from "@/hooks/usePreferenceStore";
import { listElders } from "@/services/elderService";
import {
  listSessionsWithSummaries,
} from "@/services/sessionService";
import type { ElderRecord } from "@/types/elder";
import type {
  FamilyPreferences,
} from "@/lib/preferences";
import type {
  SessionWithSummaryRecord,
} from "@/types/session";

export default function AdminFamilyPage() {
  const [elders, setElders] = useState<
    ElderRecord[]
  >([]);
  const [sessions, setSessions] =
    useState<SessionWithSummaryRecord[]>(
      []
    );
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const {
    preferences,
    setPreferences,
  } =
    useFamilyPreferencesStore();

  useEffect(() => {
    const load = async () => {
      try {
        const [
          nextElders,
          nextSessions,
        ] = await Promise.all([
          listElders(),
          listSessionsWithSummaries(),
        ]);

        setElders(nextElders);
        setSessions(
          nextSessions.filter(
            (session) =>
              session.status === "ended"
          )
        );
        setError(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "보호자 연결 정보를 불러오지 못했어요."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const latestSessionByElder = useMemo(
    () =>
      sessions.reduce<
        Record<string, SessionWithSummaryRecord>
      >((accumulator, session) => {
        if (!accumulator[session.elder_id]) {
          accumulator[session.elder_id] =
            session;
        }
        return accumulator;
      }, {}),
    [sessions]
  );

  const readyCount = useMemo(
    () =>
      elders.filter((elder) =>
        Boolean(
          getFamilySummaryText(
            latestSessionByElder[
              elder.id
            ]
          )
        )
      ).length,
    [elders, latestSessionByElder]
  );

  const updatePreferences = (
    patch: Partial<FamilyPreferences>
  ) => {
    setPreferences(
      patchFamilyPreferences(
        preferences,
        patch
      )
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            보호자 연결
          </h1>
          <p className="mt-2 text-[#6f5d50]">
            가족에게 전달할 요약 준비 상태와 공유 기본 설정을 관리합니다.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            [
              "공유 준비된 어르신",
              `${readyCount}명`,
            ],
            [
              "월간 리포트",
              preferences.monthlyReport
                ? "사용"
                : "중지",
            ],
            [
              "알림 주기",
              preferences.alertFrequency,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[28px] bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-[#8a7463]">
                {label}
              </p>
              <p className="mt-2 text-2xl font-black text-[#2d2a26]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">
              공유 기본 설정
            </h2>

            <div className="mt-5 space-y-4">
              {[
                [
                  "monthlyReport",
                  "월간 리포트 발송",
                ],
                [
                  "shareHighlights",
                  "기억 하이라이트 공유",
                ],
              ].map(([key, label]) => {
                const enabled =
                  preferences[
                    key as keyof FamilyPreferences
                  ] as boolean;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      updatePreferences(
                        {
                          [key]:
                            !enabled,
                        } as Partial<FamilyPreferences>
                      );
                    }}
                    className="flex w-full items-center justify-between rounded-2xl bg-[#f7f4ee] px-4 py-4 text-left"
                  >
                    <span className="font-bold text-[#2d2a26]">
                      {label}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        enabled
                          ? "bg-[#edf4ec] text-[#6f9075]"
                          : "bg-[#ece4d8] text-[#8a7463]"
                      }`}
                    >
                      {enabled
                        ? "켜짐"
                        : "꺼짐"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-[#7d766d]">
                알림 주기
              </p>
              <div className="mt-3 flex gap-2">
                {[
                  "often",
                  "daily",
                  "weekly",
                ].map((option) => {
                  const active =
                    preferences.alertFrequency ===
                    option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        updatePreferences(
                          {
                            alertFrequency:
                              option as FamilyPreferences["alertFrequency"],
                          }
                        );
                      }}
                      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold ${
                        active
                          ? "bg-[#edf4ec] text-[#6f9075] ring-2 ring-[#8ba77c]"
                          : "bg-[#f7f4ee] text-[#6f5d50]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">
                어르신별 공유 준비 상태
              </h2>
              <span className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-bold text-[#5f7b62]">
                최신 종료 세션 기준
              </span>
            </div>

            {error && (
              <div className="mt-5 rounded-3xl bg-[#fff3ef] p-5 text-sm text-[#8a5f57] shadow-sm">
                {error}
              </div>
            )}

            <div className="mt-5 space-y-4">
              {isLoading && (
                <div className="rounded-[24px] bg-[#faf8f4] p-5 text-[#7d766d]">
                  보호자 연결 현황을 불러오고 있어요.
                </div>
              )}

              {!isLoading &&
                elders.map((elder) => {
                  const latestSession =
                    latestSessionByElder[
                      elder.id
                    ];
                  const familySummary =
                    latestSession
                      ? getFamilySummaryText(
                          latestSession
                        )
                      : null;
                  const tags =
                    latestSession
                      ? getSessionTagList(
                          latestSession
                        ).slice(0, 5)
                      : [];

                  return (
                    <article
                      key={elder.id}
                      className="rounded-[24px] border border-[#ece4d8] bg-[#faf8f4] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-[#8a7463]">
                            {elder.facility_name ||
                              "시설 미기록"}
                          </p>
                          <h3 className="mt-1 text-xl font-black text-[#2d2a26]">
                            {getElderLabel(elder)}
                          </h3>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            familySummary
                              ? "bg-[#edf4ec] text-[#5f7b62]"
                              : "bg-[#ece4d8] text-[#8a7463]"
                          }`}
                        >
                          {familySummary
                            ? "공유 준비됨"
                            : "아직 대화 요약 없음"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-[#7d766d]">
                        최근 종료 세션{" "}
                        {latestSession
                          ? formatAdminDate(
                              latestSession.ended_at ||
                                latestSession.started_at
                            )
                          : "없음"}
                      </p>

                      <div className="mt-4 rounded-[22px] bg-white p-4">
                        <p className="text-sm font-bold text-[#8a7463]">
                          가족 전달 문구
                        </p>
                        <p className="mt-3 text-[15px] leading-[1.8] text-[#5f5a53]">
                          {familySummary ||
                            "아직 가족에게 공유할 대화 요약이 없습니다."}
                        </p>
                      </div>

                      {tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={`${elder.id}:${tag}`}
                              className="rounded-full bg-[#edf4ec] px-3 py-1 text-sm font-semibold text-[#5f7b62]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}

              {!isLoading &&
                elders.length === 0 && (
                  <div className="rounded-[24px] bg-[#faf8f4] p-5 text-[#7d766d]">
                    아직 등록된 어르신이 없습니다.
                  </div>
                )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
