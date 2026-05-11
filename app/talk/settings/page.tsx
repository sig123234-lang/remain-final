"use client";

import {
  useMemo,
} from "react";

import BottomTab from "@/components/talk/BottomTab";
import Header from "@/components/talk/Header";
import {
  type TalkFontSizeOption,
  type TalkSpeechRateOption,
  type TalkVoiceOption,
} from "@/lib/preferences";
import {
  patchTalkPreferences,
  useTalkPreferencesStore,
} from "@/hooks/usePreferenceStore";

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

export default function SettingsPage() {
  const {
    preferences,
    setPreferences,
  } =
    useTalkPreferencesStore();

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

  const isReady = true;

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        
        <Header subtitle="편안한 환경으로 맞춰드릴게요" />

        <main className="mt-6 flex flex-1 flex-col gap-4">
          
          {/* 목소리 설정 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  목소리 설정
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  편안한 목소리를 선택해 주세요
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
          </section>

          {/* 글자 크기 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  글자 크기
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  읽기 편한 크기로 조절해 주세요
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
          </section>

          {/* 말하기 속도 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  말하기 속도
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  천천히 들으실 수 있도록 조절해요
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

          {/* 보호자 연결 */}
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-black">
                  보호자 연결
                </h2>

                <p className="mt-1 text-sm text-[#8a7463]">
                  보호자와 연결되어 있어요
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf4ec] text-xl">
                🌿
              </div>
            </div>

            <div className="mt-5 rounded-[24px] bg-[#f8f3ea] p-5">
              <div className="flex items-center justify-between">
                
                <div>
                  <p className="text-[18px] font-black">
                    김민수 보호자
                  </p>

                  <p className="mt-1 text-sm text-[#8a7463]">
                    최근 확인 · 오늘 오후 1:20
                  </p>
                </div>

                <div className="rounded-full bg-[#edf4ec] px-4 py-2 text-sm font-black text-[#6f9075]">
                  연결됨
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <h2 className="text-[22px] font-black">
              설정 상태
            </h2>
            <p className="mt-3 text-[16px] leading-[1.8] text-[#6f5d50]">
              {isReady
                ? "지금 고른 설정은 이 기기에서 바로 적용돼요."
                : "설정을 불러오고 있어요."}
            </p>
          </section>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}
