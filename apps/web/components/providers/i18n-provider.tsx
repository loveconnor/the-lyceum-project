"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import {
  DEFAULT_LOCALE,
  LANGUAGE_COOKIE_NAME,
  Locale,
  createTranslator,
  getLocaleFromString,
  RTL_LOCALES,
  type MessageKey
} from "@/lib/i18n";

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

type I18nContextValue = {
  locale: Locale;
  t: Translator;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({
  locale,
  children
}: {
  locale?: string | null;
  children: React.ReactNode;
}) {
  const resolvedLocale = getLocaleFromString(locale);
  const t = useMemo(() => createTranslator(resolvedLocale), [resolvedLocale]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const nextLocale = resolvedLocale || DEFAULT_LOCALE;
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = RTL_LOCALES.has(nextLocale) ? "rtl" : "ltr";
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [resolvedLocale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale: resolvedLocale,
      t
    }),
    [resolvedLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

