"use client";

import {
  type AdminPreferences,
} from "@/lib/preferences";
import {
  patchAdminPreferences,
  useAdminPreferencesStore,
} from "@/hooks/usePreferenceStore";

export default function AdminSettingsPage() {
  const {
    preferences,
    setPreferences,
  } =
    useAdminPreferencesStore();

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

  const cards = [
    {
      label: "STT 처리 방식",
      value:
        preferences.sttProvider ===
        "browser"
          ? "브라우저 인식 우선"
          : "서버 STT 우선",
    },
    {
      label: "TTS 미리 듣기",
      value: preferences.ttsPreview
        ? "사용"
        : "중지",
    },
    {
      label: "실시간 모니터",
      value:
        preferences.realtimeMonitor
          ? "활성화"
          : "비활성화",
    },
    {
      label: "자동 요약",
      value: preferences.autoSummary
        ? "사용"
        : "중지",
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-black tracking-tight">
          운영 설정
        </h1>
        <p className="mt-2 text-[#6f5d50]">
          STT, TTS, AI, realtime 운영 상태를 확인하는 영역입니다.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cards.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-[28px] bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-[#8a7463]">
                {label}
              </p>
              <p className="mt-2 text-lg font-semibold text-[#2d2a26]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">
              STT 우선 경로
            </h2>
            <div className="mt-4 flex gap-3">
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
                        : "bg-[#f7f4ee] text-[#6f5d50]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">
              운영 토글
            </h2>
            <div className="mt-4 space-y-4">
              {[
                [
                  "ttsPreview",
                  "TTS 미리 듣기",
                ],
                [
                  "realtimeMonitor",
                  "실시간 모니터",
                ],
                [
                  "autoSummary",
                  "자동 요약 저장",
                ],
              ].map(([key, label]) => {
                const enabled =
                  preferences[
                    key as keyof AdminPreferences
                  ] as boolean;

                return (
                  <button
                    key={key}
                    onClick={() =>
                      updatePreferences(
                        {
                          [key]:
                            !enabled,
                        } as Partial<AdminPreferences>
                      )
                    }
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
          </section>
        </div>
      </div>
    </div>
  );
}
