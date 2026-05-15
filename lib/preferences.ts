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

/**
 * 캐싱 critical: 이 load 함수들은 `useSyncExternalStore` 의 getSnapshot 으로
 * 매 render 마다 호출된다. `mergeObject` 가 객체 spread 로 새 reference 를
 * 반환하면 React 가 "snapshot이 매 render 마다 바뀐다" 로 판단하고
 *   "The result of getSnapshot should be cached to avoid an infinite loop"
 * 를 throw → 컴포넌트 트리 unmount → 빈 화면.
 *
 * localStorage raw string 이 같으면 같은 객체 reference 를 돌려준다.
 */
type PreferenceCache<T> = {
  raw: string | null;
  value: T;
} | null;

let talkCache: PreferenceCache<TalkPreferences> =
  null;
let familyCache: PreferenceCache<FamilyPreferences> =
  null;
let adminCache: PreferenceCache<AdminPreferences> =
  null;

export function loadTalkPreferences(): TalkPreferences {
  const raw = readRaw(TALK_PREFERENCES_KEY);
  if (talkCache && talkCache.raw === raw) {
    return talkCache.value;
  }
  const value = mergeObject(
    defaultTalkPreferences,
    raw
  );
  talkCache = { raw, value };
  return value;
}

export function saveTalkPreferences(
  preferences: TalkPreferences
) {
  writeRaw(TALK_PREFERENCES_KEY, preferences);
  talkCache = null;
}

export function loadFamilyPreferences(): FamilyPreferences {
  const raw = readRaw(FAMILY_PREFERENCES_KEY);
  if (familyCache && familyCache.raw === raw) {
    return familyCache.value;
  }
  const value = mergeObject(
    defaultFamilyPreferences,
    raw
  );
  familyCache = { raw, value };
  return value;
}

export function saveFamilyPreferences(
  preferences: FamilyPreferences
) {
  writeRaw(
    FAMILY_PREFERENCES_KEY,
    preferences
  );
  familyCache = null;
}

export function loadAdminPreferences(): AdminPreferences {
  const raw = readRaw(ADMIN_PREFERENCES_KEY);
  if (adminCache && adminCache.raw === raw) {
    return adminCache.value;
  }
  const value = mergeObject(
    defaultAdminPreferences,
    raw
  );
  adminCache = { raw, value };
  return value;
}

export function saveAdminPreferences(
  preferences: AdminPreferences
) {
  writeRaw(
    ADMIN_PREFERENCES_KEY,
    preferences
  );
  adminCache = null;
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
