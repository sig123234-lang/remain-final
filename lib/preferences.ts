export type TalkVoiceOption =
  | "warm-female"
  | "calm-male";

export type TalkFontSizeOption =
  | "medium"
  | "large"
  | "xlarge";

export type TalkSpeechRateOption =
  | "slow"
  | "normal"
  | "fast";

export interface TalkPreferences {
  voice: TalkVoiceOption;
  fontSize: TalkFontSizeOption;
  speechRate: TalkSpeechRateOption;
}

export interface FamilyPreferences {
  monthlyReport: boolean;
  shareHighlights: boolean;
  alertFrequency:
    | "often"
    | "daily"
    | "weekly";
}

export interface AdminPreferences {
  sttProvider:
    | "browser"
    | "server";
  ttsPreview: boolean;
  realtimeMonitor: boolean;
  autoSummary: boolean;
}

export const TALK_PREFERENCES_KEY =
  "remain-talk-preferences";
export const FAMILY_PREFERENCES_KEY =
  "remain-family-preferences";
export const ADMIN_PREFERENCES_KEY =
  "remain-admin-preferences";
export const PREFERENCES_UPDATED_EVENT =
  "remain-preferences-updated";

export const defaultTalkPreferences: TalkPreferences =
  {
    voice: "warm-female",
    fontSize: "large",
    speechRate: "slow",
  };

export const defaultFamilyPreferences: FamilyPreferences =
  {
    monthlyReport: true,
    shareHighlights: true,
    alertFrequency: "daily",
  };

export const defaultAdminPreferences: AdminPreferences =
  {
    sttProvider: "browser",
    ttsPreview: true,
    realtimeMonitor: true,
    autoSummary: true,
  };

function isBrowser() {
  return (
    typeof window !==
    "undefined"
  );
}

function readRaw(
  storageKey: string
) {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(
    storageKey
  );
}

function writeRaw(
  storageKey: string,
  value: unknown
) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify(value)
  );

  window.dispatchEvent(
    new CustomEvent(
      PREFERENCES_UPDATED_EVENT,
      {
        detail: {
          key: storageKey,
        },
      }
    )
  );
}

function mergeObject<T extends object>(
  defaults: T,
  rawValue: string | null
) {
  if (!rawValue) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(
      rawValue
    ) as Partial<T>;

    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export function loadTalkPreferences() {
  return mergeObject(
    defaultTalkPreferences,
    readRaw(
      TALK_PREFERENCES_KEY
    )
  );
}

export function saveTalkPreferences(
  preferences: TalkPreferences
) {
  writeRaw(
    TALK_PREFERENCES_KEY,
    preferences
  );
}

export function loadFamilyPreferences() {
  return mergeObject(
    defaultFamilyPreferences,
    readRaw(
      FAMILY_PREFERENCES_KEY
    )
  );
}

export function saveFamilyPreferences(
  preferences: FamilyPreferences
) {
  writeRaw(
    FAMILY_PREFERENCES_KEY,
    preferences
  );
}

export function loadAdminPreferences() {
  return mergeObject(
    defaultAdminPreferences,
    readRaw(
      ADMIN_PREFERENCES_KEY
    )
  );
}

export function saveAdminPreferences(
  preferences: AdminPreferences
) {
  writeRaw(
    ADMIN_PREFERENCES_KEY,
    preferences
  );
}

export function getSpeechRateValue(
  rate: TalkSpeechRateOption
) {
  if (rate === "slow") {
    return 0.8;
  }

  if (rate === "fast") {
    return 1;
  }

  return 0.9;
}

export function getQuestionTextClass(
  fontSize: TalkFontSizeOption
) {
  if (fontSize === "medium") {
    return "text-[30px]";
  }

  if (fontSize === "xlarge") {
    return "text-[38px]";
  }

  return "text-[34px]";
}

export function getBodyTextClass(
  fontSize: TalkFontSizeOption
) {
  if (fontSize === "medium") {
    return "text-[16px]";
  }

  if (fontSize === "xlarge") {
    return "text-[19px]";
  }

  return "text-[17px]";
}

export function pickPreferredVoice(
  voiceOption: TalkVoiceOption
) {
  if (
    typeof window ===
      "undefined" ||
    !("speechSynthesis" in
      window)
  ) {
    return null;
  }

  const voices =
    window.speechSynthesis.getVoices();
  const koreanVoices =
    voices.filter((voice) =>
      voice.lang
        .toLowerCase()
        .startsWith("ko")
    );

  if (koreanVoices.length === 0) {
    return null;
  }

  const femaleHints = [
    "female",
    "woman",
    "yuna",
    "seoyeon",
    "soyoung",
  ];
  const maleHints = [
    "male",
    "man",
    "inho",
    "minho",
    "hyun",
  ];

  const hints =
    voiceOption ===
    "warm-female"
      ? femaleHints
      : maleHints;

  const matchedVoice =
    koreanVoices.find((voice) => {
      const voiceName =
        voice.name.toLowerCase();

      return hints.some((hint) =>
        voiceName.includes(hint)
      );
    });

  return (
    matchedVoice ??
    koreanVoices[0]
  );
}
