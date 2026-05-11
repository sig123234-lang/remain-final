"use client";

import FamilyBottomTab from "@/components/family/FamilyBottomTab";
import {
  type FamilyPreferences,
} from "@/lib/preferences";
import {
  patchFamilyPreferences,
  useFamilyPreferencesStore,
} from "@/hooks/usePreferenceStore";

export default function FamilySettingsPage() {
  const {
    preferences,
    setPreferences,
  } =
    useFamilyPreferencesStore();

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

  const alertOptions: Array<{
    key: FamilyPreferences["alertFrequency"];
    label: string;
  }> = [
    {
      key: "often",
      label: "자주",
    },
    {
      key: "daily",
      label: "매일",
    },
    {
      key: "weekly",
      label: "매주",
    },
  ];

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
              가족 화면 설정과 안내예요
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff8ef]/92 text-xl shadow-sm ring-1 ring-white/90">
            ⚙️
          </div>
        </header>

        <main className="mt-6 flex flex-1 flex-col gap-4">
          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[22px] font-black">
                  리포트 받기
                </h2>
                <p className="mt-1 text-sm text-[#8a7463]">
                  월간 가족 요약을 계속 받으실 수 있어요
                </p>
              </div>
              <button
                onClick={() =>
                  updatePreferences(
                    {
                      monthlyReport:
                        !preferences.monthlyReport,
                    }
                  )
                }
                className={`relative h-8 w-14 rounded-full transition ${
                  preferences.monthlyReport
                    ? "bg-[#8ba77c]"
                    : "bg-[#d9d2c7]"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${
                    preferences.monthlyReport
                      ? "left-7"
                      : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div>
                <h2 className="text-[22px] font-black">
                  핵심 장면 공유
                </h2>
                <p className="mt-1 text-sm text-[#8a7463]">
                  감정적으로 중요한 장면을 요약에 함께 담아요
                </p>
              </div>
              <button
                onClick={() =>
                  updatePreferences(
                    {
                      shareHighlights:
                        !preferences.shareHighlights,
                    }
                  )
                }
                className={`relative h-8 w-14 rounded-full transition ${
                  preferences.shareHighlights
                    ? "bg-[#8ba77c]"
                    : "bg-[#d9d2c7]"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${
                    preferences.shareHighlights
                      ? "left-7"
                      : "left-1"
                  }`}
                />
              </button>
            </div>
          </section>

          <section className="rounded-[30px] bg-white/88 p-5 shadow-[0_18px_50px_rgba(93,68,42,0.1)] ring-1 ring-white/90">
            <h2 className="text-[22px] font-black">
              알림 빈도
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {alertOptions.map((option) => {
                const active =
                  preferences.alertFrequency ===
                  option.key;

                return (
                  <button
                    key={option.key}
                    onClick={() =>
                      updatePreferences(
                        {
                          alertFrequency:
                            option.key,
                        }
                      )
                    }
                    className={`rounded-[18px] px-3 py-4 text-sm font-black ${
                      active
                        ? "bg-[#edf4ec] text-[#6f9075] ring-2 ring-[#8ba77c]"
                        : "bg-[#f8f3ea] text-[#6f5d50]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      <FamilyBottomTab />
    </div>
  );
}
