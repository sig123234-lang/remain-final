"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  AdminPreferences,
} from "@/lib/preferences";
import {
  patchAdminPreferences,
  useAdminPreferencesStore,
} from "@/hooks/usePreferenceStore";

type SystemStatusPayload = {
  services: {
    openAiReady: boolean;
    browserSupabaseReady: boolean;
    serverSupabaseReady: boolean;
    browserSttReady: boolean;
    serverSttReady: boolean;
  };
  stats: {
    elderCount: number;
    activeSessionCount: number;
    endedSessionCount: number;
    archiveCount: number;
    familyReadyCount: number;
    latestSessionAt?: string | null;
  };
  defaults: {
    chatModel: string;
    firstQuestion: string;
  };
  scope?: {
    adminSettingsStorage?: string;
  };
  warning?: string;
};

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "기록 없음";
  }

  return new Date(value).toLocaleString(
    "ko-KR"
  );
}

export default function AdminSettingsPage() {
  const {
    preferences,
    setPreferences,
  } =
    useAdminPreferencesStore();
  const [systemStatus, setSystemStatus] =
    useState<SystemStatusPayload | null>(
      null
    );
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const updatePreferences = (
    patch: Partial<AdminPreferences>
  ) => {
    setPreferences(
      patchAdminPreferences(
        preferences,
        patch
      )
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(
          "/api/admin/system-status"
        );

        const payload =
          (await response
            .json()
            .catch(() => ({}))) as
            | SystemStatusPayload
            | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload &&
              typeof payload.error ===
                "string"
              ? payload.error
              : "운영 상태를 불러오지 못했어요."
          );
        }

        setSystemStatus(
          payload as SystemStatusPayload
        );
        setError(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "운영 상태를 불러오지 못했어요."
        );
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId =
      window.setTimeout(() => {
        void load();
      }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const serviceCards = useMemo(
    () => {
      if (!systemStatus) {
        return [];
      }

      return [
        {
          label: "OpenAI 응답 엔진",
          ready:
            systemStatus.services
              .openAiReady,
          detail: systemStatus.defaults
            .chatModel,
        },
        {
          label: "Supabase 서버 쓰기",
          ready:
            systemStatus.services
              .serverSupabaseReady,
          detail:
            "service role 연결",
        },
        {
          label: "Supabase 브라우저 연결",
          ready:
            systemStatus.services
              .browserSupabaseReady,
          detail:
            "publishable key 연결",
        },
        {
          label: "브라우저 STT",
          ready:
            systemStatus.services
              .browserSttReady,
          detail:
            "현재 실제 대화 경로",
        },
        {
          label: "서버 STT",
          ready:
            systemStatus.services
              .serverSttReady,
          detail:
            "현재는 미연결",
        },
      ];
    },
    [systemStatus]
  );

  const scopeLabel =
    systemStatus?.scope
      ?.adminSettingsStorage ===
    "browser_local"
      ? "이 브라우저의 운영 콘솔에 저장"
      : "운영 저장 범위 확인 필요";

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              운영 설정
            </h1>
            <p className="mt-2 text-[#6f5d50]">
              서비스 연결 상태와 운영 토글 적용 범위를 함께 관리합니다.
            </p>
            <p className="mt-2 text-sm font-semibold text-[#8a715c]">
              설정 저장 범위: {scopeLabel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                void fetch(
                  "/api/admin/system-status"
                )
                  .then(async (response) => {
                    const payload =
                      (await response
                        .json()
                        .catch(() => ({}))) as
                        | SystemStatusPayload
                        | {
                            error?: string;
                          };

                    if (!response.ok) {
                      throw new Error(
                        "error" in payload &&
                          typeof payload.error ===
                            "string"
                          ? payload.error
                          : "운영 상태를 불러오지 못했어요."
                      );
                    }

                    setSystemStatus(
                      payload as SystemStatusPayload
                    );
                    setError(null);
                  })
                  .catch((caughtError) => {
                    setError(
                      caughtError instanceof
                        Error
                        ? caughtError.message
                        : "운영 상태를 불러오지 못했어요."
                    );
                  })
                  .finally(() => {
                    setIsLoading(false);
                  });
              }}
              className="rounded-2xl bg-[#edf4ec] px-5 py-3 text-sm font-semibold text-[#5f7b62] shadow-sm"
            >
              상태 새로고침
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

        {systemStatus?.warning && (
          <div className="mt-6 rounded-3xl bg-[#fff8ef] p-5 text-sm text-[#8a715c] shadow-sm">
            {systemStatus.warning}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {(isLoading
            ? Array.from({ length: 5 }).map(
                (_, index) => ({
                  label: `status-${index}`,
                  ready: false,
                  detail:
                    "불러오는 중",
                })
              )
            : serviceCards
          ).map((card) => (
            <div
              key={card.label}
              className="rounded-[28px] bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-[#8a7463]">
                {card.label}
              </p>
              <p
                className={`mt-2 text-lg font-black ${
                  card.ready
                    ? "text-[#5f7b62]"
                    : "text-[#b16b5f]"
                }`}
              >
                {card.ready
                  ? "준비됨"
                  : "미설정"}
              </p>
              <p className="mt-2 text-sm text-[#7d766d]">
                {card.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            [
              "등록 어르신",
              `${systemStatus?.stats.elderCount ?? 0}명`,
            ],
            [
              "진행 중 세션",
              `${systemStatus?.stats.activeSessionCount ?? 0}건`,
            ],
            [
              "종료 리포트",
              `${systemStatus?.stats.endedSessionCount ?? 0}건`,
            ],
            [
              "기억 아카이브",
              `${systemStatus?.stats.archiveCount ?? 0}건`,
            ],
            [
              "최근 세션 활동",
              formatDateTime(
                systemStatus?.stats
                  .latestSessionAt
              ),
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[28px] bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-[#8a7463]">
                {label}
              </p>
              <p className="mt-2 text-lg font-black text-[#2d2a26]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">
              운영 토글
            </h2>

            <div className="mt-5 rounded-[22px] bg-[#faf8f4] p-4">
              <p className="text-sm font-bold text-[#8a7463]">
                STT 처리 방식
              </p>
              <div className="mt-3 flex gap-3">
                {[
                  {
                    key: "browser",
                    label: "브라우저",
                  },
                  {
                    key: "server",
                    label: "서버",
                  },
                ].map((option) => {
                  const active =
                    preferences.sttProvider ===
                    option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        updatePreferences(
                          {
                            sttProvider:
                              option.key as AdminPreferences["sttProvider"],
                          }
                        )
                      }
                      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold ${
                        active
                          ? "bg-[#edf4ec] text-[#6f9075] ring-2 ring-[#8ba77c]"
                          : "bg-white text-[#6f5d50]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#7d766d]">
                현재 실제 대화는 브라우저 STT 경로가 사용됩니다. 서버 STT는
                연결 상태를 이 화면에서 확인할 수 있지만 아직 대화 플로우에
                직접 투입되진 않습니다.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {[
                {
                  key: "ttsPreview",
                  label: "TTS 미리 듣기",
                  description:
                    "음성 출력 경로를 운영 점검할 때 참고하는 옵션입니다.",
                },
                {
                  key: "realtimeMonitor",
                  label: "실시간 모니터",
                  description:
                    "관리자 live 화면의 자동 구독과 폴링을 켜거나 끕니다.",
                },
                {
                  key: "autoSummary",
                  label: "자동 요약 저장",
                  description:
                    "세션 종료 시 summary와 가족 공유용 요약을 함께 저장합니다.",
                },
              ].map(
                ({
                  key,
                  label,
                  description,
                }) => {
                  const enabled =
                    preferences[
                      key as keyof AdminPreferences
                    ] as boolean;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        updatePreferences(
                          {
                            [key]:
                              !enabled,
                          } as Partial<AdminPreferences>
                        )
                      }
                      className="flex w-full items-start justify-between gap-4 rounded-2xl bg-[#f7f4ee] px-4 py-4 text-left"
                    >
                      <div>
                        <p className="font-bold text-[#2d2a26]">
                          {label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#7d766d]">
                          {description}
                        </p>
                      </div>
                      <span
                        className={`mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
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
                }
              )}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">
              운영 기준값
            </h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-[22px] bg-[#faf8f4] p-4">
                <p className="text-sm font-bold text-[#8a7463]">
                  기본 질문 모델
                </p>
                <p className="mt-2 text-lg font-black text-[#2d2a26]">
                  {systemStatus?.defaults
                    .chatModel ||
                    "불러오는 중"}
                </p>
              </div>

              <div className="rounded-[22px] bg-[#faf8f4] p-4">
                <p className="text-sm font-bold text-[#8a7463]">
                  첫 질문 기본값
                </p>
                <p className="mt-2 text-[16px] leading-7 text-[#5f5a53]">
                  {systemStatus?.defaults
                    .firstQuestion ||
                    "불러오는 중"}
                </p>
              </div>

              <div className="rounded-[22px] bg-[#edf4ec] p-4">
                <p className="text-sm font-bold text-[#5f7b62]">
                  현재 적용 중인 영향
                </p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-[#49604d]">
                  <p>
                    실시간 모니터:{" "}
                    {preferences.realtimeMonitor
                      ? "admin/live 화면이 자동 구독과 폴링을 사용합니다."
                      : "admin/live 화면은 수동 새로고침 중심으로 동작합니다."}
                  </p>
                  <p>
                    자동 요약 저장:{" "}
                    {preferences.autoSummary
                      ? "세션 종료 시 요약이 저장됩니다."
                      : "세션 종료 시 자동 요약 저장을 생략합니다."}
                  </p>
                  <p>
                    TTS 미리 듣기: 현재 코드에서는 참고 토글로 유지되며,
                    향후 음성 재생 전략에 연결할 준비가 되어 있습니다.
                  </p>
                </div>
              </div>

              <div className="rounded-[22px] bg-[#f8f3ea] p-4">
                <p className="text-sm font-bold text-[#8a7463]">
                  바로가기
                </p>
                <div className="mt-4 grid gap-3">
                  <Link
                    href="/admin/live"
                    className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#2d2a26]"
                  >
                    실시간 세션 열기
                  </Link>
                  <Link
                    href="/admin/memories"
                    className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#2d2a26]"
                  >
                    기억 아카이브 보기
                  </Link>
                  <Link
                    href="/admin/reports"
                    className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#2d2a26]"
                  >
                    세션 리포트 보기
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
