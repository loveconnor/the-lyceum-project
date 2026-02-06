"use client";
 

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  DEFAULT_USER_SETTINGS,
  UserSettings,
  coerceSettings,
  mergeSettings
} from "@/lib/settings";
import { splitFullName } from "@/lib/user-profile";

type SettingsContextValue = {
  settings: UserSettings;
  isSaving: boolean;
  isRefreshing: boolean;
  saveSettings: (updates: Partial<UserSettings>) => Promise<UserSettings>;
  refresh: () => Promise<UserSettings>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({
  initialSettings,
  children
}: {
  initialSettings?: Partial<UserSettings> | null;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<UserSettings>(
    mergeSettings(DEFAULT_USER_SETTINGS, initialSettings ?? undefined)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const saveSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      setIsSaving(true);
      const supabase = createClient();

      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();

        if (error || !user) {
          throw new Error(error?.message || "You must be signed in to update settings.");
        }

        const merged = mergeSettings(settings, updates);
        const nextMetadata = { ...(user.user_metadata ?? {}), settings: merged };
        const { error: updateError } = await supabase.auth.updateUser({
          data: nextMetadata
        });

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Keep a row in public.profiles in sync for visibility in Studio
        try {
          const [firstName, lastName] = splitFullName(
            merged.account?.name ?? merged.profile.username ?? ""
          );
          await supabase.from("profiles").upsert({
            id: user.id,
            email: merged.profile.email,
            first_name: firstName,
            last_name: lastName,
            full_name: merged.account?.name ?? merged.profile.username ?? null,
            avatar_url: merged.profile.avatarUrl ?? null
          });
        } catch (err) {
          console.error("Failed to upsert profile row", err);
        }

        setSettings(merged);
        return merged;
      } finally {
        setIsSaving(false);
      }
    },
    [settings]
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (error || !user) {
        throw new Error(error?.message || "Unable to load settings for this account.");
      }

      const metadata = user?.user_metadata as { settings?: unknown } | undefined;
      const nextSettings = coerceSettings(metadata?.settings);
      setSettings(nextSettings);
      return nextSettings;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isSaving,
      isRefreshing,
      saveSettings,
      refresh
    }),
    [isRefreshing, isSaving, saveSettings, settings, refresh]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useUserSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useUserSettings must be used within a SettingsProvider");
  }
  return context;
}
