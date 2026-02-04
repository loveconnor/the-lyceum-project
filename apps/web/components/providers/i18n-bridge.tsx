"use client";

import React from "react";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { useUserSettings } from "@/components/providers/settings-provider";

export function I18nBridge({ children }: { children: React.ReactNode }) {
  const { settings } = useUserSettings();
  return <I18nProvider locale={settings.account.language}>{children}</I18nProvider>;
}

