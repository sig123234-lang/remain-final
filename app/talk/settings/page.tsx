"use client";

import {
  useEffect,
  useMemo,
  Suspense,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import BottomTab from "@/components/talk/BottomTab";
import Header from "@/components/talk/Header";
import {
  type TalkFontSizeOption,
  type TalkSpeechRateOption,
  type TalkVoiceOption,
  getBodyTextClass,
  getQuestionTextClass,
  getSpeechRateValue,
  pickPreferredVoice,
} from "@/lib/preferences";
import {
  patchTalkPreferences,
  useFamilyPreferencesStore,
  useTalkPreferencesStore,
} from "@/hooks/usePreferenceStore";
import { REMAIN_DEFAULT_ELDER_ID } from "@/lib/remain-config";
import {
  getElder,
} from "@/services/elderService";
import {
  getRecentSessions,
} from "@/services/sessionService";

const voiceOptions: Array<{
  key: TalkVoiceOption;
  title: string;
  description: string;
}> = [
  {
    key: "warm-female",
    title: "따뜻한 여성 목소리",
    description:
      "부드럽고 편안한 느낌",
  },
  {
    key: "calm-male",
    title: "차분한 남성 목소리",
    description:
      "안정적이고 조용한 느낌",
  },
];

const fontSizeOptions: Array<{
  key: TalkFontSizeOption;
  label: string;
  previewClass: string;
}> = [
  {
    key: "medium",
    label: "보통",
    previewClass: "text-[16px]",
  },
  {
    key: "large",
    label: "크게",
    previewClass: "text-[18px]",
  },
  {
    key: "xlarge",
    label: "아주 크게",
    previewClass: "text-[20px]",
  },
];

const speechRateOptions: Array<{
  key: TalkSpeechRateOption;
  label: string;
  position: string;
}> = [
  {
    key: "slow",
    label: "천천히",
    position: "left-[8%]",
  },
  {
    key: "normal",
    label: "보통",
    position: "left-[44%]",
  },
  {
    key: "fast",
    label: "빠르게",
    position: "left-[80%]",
  },
];

const familyAlertFrequencyLabelMap = {
  often: "자주",
  daily: "매일",
  weekly: "매주",
} satisfies Record<
  "often" | "daily" | "weekly",
  string
>;

type RecentSessionRecord = {
  id: string;
  started_at: string;
  summary?: string | null;
  session_summaries?:
    | {
        family_friendly_summary?: string | null;
        keywords?: string[] | null;
        emotions?: string[] | null;
      }[]
    | null;
};

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "아직 기록 없음";
  }

  return new Date(value).toLocaleString(
    "ko-KR"
  );
}

function SettingsPageBody({
  elderId,
}: {
  elderId: string;
}) {
  const {
    preferences,
    setPreferences,
  } =
    useTalkPreferencesStore();
  const {
    preferences:
      familyPreferences,
  } = useFamilyPreferencesStore();
  const [elderName, setElderName] =
    useState("어르신");
  const [recentSessions, setRecentSessions] =
    useState<RecentSessionRecord[]>(
      []
    );
  const [settingsError, setSettingsError] =
    useState<string | null>(null);
  const [voicesReady, setVoicesReady] =
    useState(false);
  const [
    browserSpeechSupported,
    setBrowserSpeechSupported,
  ] = useState(false);
  const [previewStatus, setPreviewStatus] =
    useState<
      "idle" | "playing" | "unsupported"
    >("unsupported");

  const updatePreferences = (
    patch: Partial<
      typeof preferences
    >
  ) => {
    setPreferences(
      patchTalkPreferences(
        preferences,
        patch
      )
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [elder, sessions] =
          await Promise.all([
            getElder(elderId).catch(
              () => null
            ),
            getRecentSessions(
              elderId
            ).catch(() => []),
          ]);

        if (elder) {
          setElderName(
            elder.display_name ||
              elder.full_name ||
              "어르신"
          );
        }

        setRecentSessions(
          (sessions ??
            []) as RecentSessionRecord[]
        );
        setSettingsError(null);
      } catch (caughtError) {
        setSettingsError(
          caughtError instanceof Error
            ? caughtError.message
            : "설정 정보를 불러오지 못했어요."
        );
      }
    };

    void load();
  }, [elderId]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const updateVoiceState = () => {
      setBrowserSpeechSupported(true);
      const ready =
        window.speechSynthesis
          .getVoices().length > 0;
      setVoicesReady(ready);
      setPreviewStatus((previous) =>
        ready || previous === "playing"
          ? previous ===
            "unsupported"
            ? "idle"
            : previous
          : "unsupported"
        );
    };

    queueMicrotask(updateVoiceState);
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      updateVoiceState
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        updateVoiceState
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const selectedSpeed =
    useMemo(
      () =>
        speechRateOptions.find(
          (option) =>
            option.key ===
            preferences.speechRate
        ) ??
        speechRateOptions[0],
      [preferences.speechRate]
    );
  const headingClass =
    getQuestionTextClass(
      preferences.fontSize
    );
  const bodyTextClass =
    getBodyTextClass(
      preferences.fontSize
    );
  const selectedVoice =
    voiceOptions.find(
      (option) =>
        option.key ===
        preferences.voice
    ) ?? voiceOptions[0];
  const shareableSessions =
    recentSessions.filter(
      (session) =>
        Boolean(
          session.session_summaries?.[0]
            ?.family_friendly_summary ||
            session.summary
        )
    );
  const latestShareableSession =
    shareableSessions[0];
  const latestKeywords =
    latestShareableSession
      ?.session_summaries?.[0]
      ?.keywords?.slice(0, 4) ?? [];
  const fontSizeLabel =
    fontSizeOptions.find(
      (option) =>
        option.key ===
        preferences.fontSize
    )?.label ?? "크게";
  const familyAlertLabel =
    familyAlertFrequencyLabelMap[
      familyPreferences.alertFrequency
    ];
  const previewSample = `${
    elderName.endsWith("어르신")
      ? elderName
      : `${elderName} 어르신`
  }, 오늘은 천천히 이야기 나눠볼까요?`;
  const voicePreviewReady =
    previewStatus !==
    "unsupported";

  const handlePreview = () => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      setPreviewStatus(
        "unsupported"
      );
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        previewSample
      );

    utterance.lang = "ko-KR";
    utterance.rate =
      getSpeechRateValue(
        preferences.speechRate
      );

    const preferredVoice =
      pickPreferredVoice(
        preferences.voice
      );

    if (preferredVoice) {
      utterance.voice =
        preferredVoice;
    }

    utterance.onstart = () => {
      setPreviewStatus("playing");
    };

    utterance.onend = () => {
      setPreviewStatus("idle");
    };

    utterance.onerror = () => {
      setPreviewStatus("idle");
    };

    window.speechSynthesis.speak(
      utterance
    );
  };

  const stopPreview = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.speechSynthesis.cancel();
    setPreviewStatus("idle");
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        <Header subtitle="편안한 환경으로 맞춰드릴게요" />

        <main className="mt-6 flex flex-1 flex-col gap-4">
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  목소리 설정
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  편안한 목소리를 선택하고 바로 들어보실 수 있어요
                </p>
              </div>

              <div className="text-2xl">
                🎙️
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {voiceOptions.map(
                (option) => {
                  const active =
                    preferences.voice ===
                    option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        updatePreferences(
                          {
                            voice:
                              option.key,
                          }
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-[24px] px-5 py-4 ${
                        active
                          ? "bg-[#f8f3ea] ring-2 ring-[#8ba77c]"
                          : "bg-[#faf7f1]"
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-[17px] font-black">
                          {
                            option.title
                          }
                        </p>

                        <p className="mt-1 text-sm text-[#8a7463]">
                          {
                            option.description
                          }
                        </p>
                      </div>

                      <div
                        className={`h-5 w-5 rounded-full ${
                          active
                            ? "bg-[#8ba77c]"
                            : "border-2 border-[#d8cdbf]"
                        }`}
                      />
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-5 rounded-[24px] bg-[#edf4ec] p-5">
              <p className="text-sm font-bold text-[#5f7b62]">
                지금 선택한 목소리
              </p>
              <p className="mt-2 text-lg font-black">
                {selectedVoice.title}
              </p>
              <p
                className={`mt-3 leading-[1.8] text-[#49604d] ${bodyTextClass}`}
              >
                {previewSample}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={!voicesReady}
                  className="flex-1 rounded-[18px] bg-white px-4 py-3 text-sm font-black text-[#5f7b62] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {previewStatus ===
                  "playing"
                    ? "재생 중..."
                    : "미리 듣기"}
                </button>
                <button
                  type="button"
                  onClick={stopPreview}
                  disabled={
                    previewStatus !==
                    "playing"
                  }
                  className="rounded-[18px] bg-[#f8f3ea] px-4 py-3 text-sm font-black text-[#6f5d50] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  멈추기
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  글자 크기
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  오늘 화면, 기록 화면, 대화 화면에 바로 반영돼요
                </p>
              </div>

              <div className="text-2xl">
                🔠
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              {fontSizeOptions.map(
                (option) => {
                  const active =
                    preferences.fontSize ===
                    option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        updatePreferences(
                          {
                            fontSize:
                              option.key,
                          }
                        )
                      }
                      className={`flex-1 rounded-[22px] py-4 font-black ${
                        active
                          ? "bg-[#edf4ec] text-[#6f9075] ring-2 ring-[#8ba77c]"
                          : "bg-[#f8f3ea] text-[#6f5d50]"
                      } ${option.previewClass}`}
                    >
                      {option.label}
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-5 rounded-[24px] bg-[#faf7f1] p-5">
              <p className="text-sm font-bold text-[#8a7463]">
                미리보기
              </p>
              <p
                className={`mt-3 font-black leading-[1.5] ${headingClass}`}
              >
                오늘은 어떤 이야기가
                <br />
                떠오르시나요?
              </p>
              <p
                className={`mt-3 leading-[1.8] text-[#6f5d50] ${bodyTextClass}`}
              >
                지금 고른 글자 크기가 이야기 화면과 기록 화면에 함께 적용됩니다.
              </p>
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  말하기 속도
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  AI 음성 속도와 미리듣기 속도에 바로 반영돼요
                </p>
              </div>

              <div className="text-2xl">
                ⏳
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm font-bold text-[#8a7463]">
                <span>천천히</span>
                <span>보통</span>
                <span>빠르게</span>
              </div>

              <div className="relative mt-5 h-3 rounded-full bg-[#f2eadf]">
                <div
                  className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#8ba77c] shadow-lg ${selectedSpeed.position}`}
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {speechRateOptions.map(
                  (option) => {
                    const active =
                      preferences.speechRate ===
                      option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() =>
                          updatePreferences(
                            {
                              speechRate:
                                option.key,
                            }
                          )
                        }
                        className={`rounded-[18px] px-3 py-3 text-sm font-black ${
                          active
                            ? "bg-[#edf4ec] text-[#6f9075] ring-2 ring-[#8ba77c]"
                            : "bg-[#f8f3ea] text-[#6f5d50]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  보호자 연결
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  가족에게 전달할 요약 준비 상태를 보여드려요
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf4ec] text-xl">
                🌿
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#f8f3ea] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[18px] font-black">
                    가족 공유 준비 상태
                  </p>

                  <p className="mt-1 text-sm text-[#8a7463]">
                    최근 공유 가능 시각 ·{" "}
                    {formatDateTime(
                      latestShareableSession?.started_at
                    )}
                  </p>
                </div>

                <div className="rounded-full bg-[#edf4ec] px-4 py-2 text-sm font-black text-[#6f9075]">
                  {shareableSessions.length > 0
                    ? "준비됨"
                    : "대기 중"}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[18px] bg-white px-4 py-4">
                  <p className="text-sm text-[#8a7463]">
                    공유 가능한 요약
                  </p>
                  <p className="mt-2 text-lg font-black">
                    {shareableSessions.length}건
                  </p>
                </div>

                <div className="rounded-[18px] bg-white px-4 py-4">
                  <p className="text-sm text-[#8a7463]">
                    가족 알림 주기
                  </p>
                  <p className="mt-2 text-lg font-black">
                    {familyAlertLabel}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[18px] bg-white px-4 py-4">
                <p className="text-sm text-[#8a7463]">
                  보호자 공유 설정
                </p>
                <p className="mt-2 text-[15px] leading-[1.8] text-[#6f5d50]">
                  월간 리포트{" "}
                  {familyPreferences.monthlyReport
                    ? "켜짐"
                    : "꺼짐"}
                  {" · "}핵심 장면 공유{" "}
                  {familyPreferences.shareHighlights
                    ? "켜짐"
                    : "꺼짐"}
                </p>
              </div>

              {latestKeywords.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {latestKeywords.map(
                    (keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#6f9075]"
                      >
                        #{keyword}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <h2 className="text-[22px] font-black">
              설정 상태
            </h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-[20px] bg-[#f8f3ea] p-4">
                <p className="text-sm font-bold text-[#8a7463]">
                  현재 적용 안내
                </p>
                <p className="mt-2 text-[16px] leading-[1.8] text-[#6f5d50]">
                  지금 고른 설정은 이 기기에서 바로 적용돼요.
                </p>
              </div>

              <div className="rounded-[20px] bg-[#edf4ec] p-4">
                <p className="text-sm font-bold text-[#5f7b62]">
                  현재 선택
                </p>
                <p className="mt-2 text-[15px] leading-[1.8] text-[#49604d]">
                  목소리: {selectedVoice.title}
                  <br />
                  글자 크기: {fontSizeLabel}
                  <br />
                  말하기 속도:{" "}
                  {selectedSpeed.label}
                </p>
              </div>

              <div className="rounded-[20px] bg-[#faf7f1] p-4">
                <p className="text-sm font-bold text-[#8a7463]">
                  기능 연결 상태
                </p>
                <p className="mt-2 text-[15px] leading-[1.8] text-[#6f5d50]">
                  음성 미리듣기:{" "}
                  {browserSpeechSupported
                    ? voicePreviewReady
                      ? "사용 가능"
                      : "목소리 불러오는 중"
                    : "지원되지 않음"}
                  <br />
                  가족 공유 요약:{" "}
                  {shareableSessions.length > 0
                    ? `${shareableSessions.length}건 준비됨`
                    : "아직 없음"}
                </p>
              </div>

              {settingsError && (
                <div className="rounded-[20px] bg-[#fff3ef] p-4 text-sm text-[#8a5f57]">
                  {settingsError}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}

function SettingsPageContent() {
  const searchParams =
    useSearchParams();
  const elderId =
    searchParams.get("elderId") ??
    REMAIN_DEFAULT_ELDER_ID;

  return (
    <SettingsPageBody elderId={elderId} />
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <SettingsPageBody
          elderId={
            REMAIN_DEFAULT_ELDER_ID
          }
        />
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
