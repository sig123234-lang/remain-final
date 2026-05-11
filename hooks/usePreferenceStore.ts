"use client";

import { useSyncExternalStore } from "react";

import {
  ADMIN_PREFERENCES_KEY,
  defaultAdminPreferences,
  defaultFamilyPreferences,
  defaultTalkPreferences,
  FAMILY_PREFERENCES_KEY,
  loadAdminPreferences,
  loadFamilyPreferences,
  loadTalkPreferences,
  PREFERENCES_UPDATED_EVENT,
  saveAdminPreferences,
  saveFamilyPreferences,
  saveTalkPreferences,
  TALK_PREFERENCES_KEY,
  type AdminPreferences,
  type FamilyPreferences,
  type TalkPreferences,
} from "@/lib/preferences";

function subscribeToPreferenceKey(
  storageKey: string,
  onStoreChange: () => void
) {
  if (
    typeof window === "undefined"
  ) {
    return () => undefined;
  }

  const handleStorage = (
    event: StorageEvent
  ) => {
    if (
      event.key &&
      event.key !== storageKey
    ) {
      return;
    }

    onStoreChange();
  };

  const handleCustomEvent =
    (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          key?: string;
        }>;

      if (
        customEvent.detail?.key &&
        customEvent.detail.key !==
          storageKey
      ) {
        return;
      }

      onStoreChange();
    };

  window.addEventListener(
    "storage",
    handleStorage
  );
  window.addEventListener(
    PREFERENCES_UPDATED_EVENT,
    handleCustomEvent
  );

  return () => {
    window.removeEventListener(
      "storage",
      handleStorage
    );
    window.removeEventListener(
      PREFERENCES_UPDATED_EVENT,
      handleCustomEvent
    );
  };
}

export function useTalkPreferencesStore() {
  const preferences =
    useSyncExternalStore(
      (onStoreChange) =>
        subscribeToPreferenceKey(
          TALK_PREFERENCES_KEY,
          onStoreChange
        ),
      loadTalkPreferences,
      () =>
        defaultTalkPreferences
    );

  return {
    preferences,
    setPreferences:
      saveTalkPreferences,
  };
}

export function useFamilyPreferencesStore() {
  const preferences =
    useSyncExternalStore(
      (onStoreChange) =>
        subscribeToPreferenceKey(
          FAMILY_PREFERENCES_KEY,
          onStoreChange
        ),
      loadFamilyPreferences,
      () =>
        defaultFamilyPreferences
    );

  return {
    preferences,
    setPreferences:
      saveFamilyPreferences,
  };
}

export function useAdminPreferencesStore() {
  const preferences =
    useSyncExternalStore(
      (onStoreChange) =>
        subscribeToPreferenceKey(
          ADMIN_PREFERENCES_KEY,
          onStoreChange
        ),
      loadAdminPreferences,
      () =>
        defaultAdminPreferences
    );

  return {
    preferences,
    setPreferences:
      saveAdminPreferences,
  };
}

export function patchTalkPreferences(
  previous: TalkPreferences,
  patch: Partial<TalkPreferences>
) {
  return {
    ...previous,
    ...patch,
  };
}

export function patchFamilyPreferences(
  previous: FamilyPreferences,
  patch: Partial<FamilyPreferences>
) {
  return {
    ...previous,
    ...patch,
  };
}

export function patchAdminPreferences(
  previous: AdminPreferences,
  patch: Partial<AdminPreferences>
) {
  return {
    ...previous,
    ...patch,
  };
}
