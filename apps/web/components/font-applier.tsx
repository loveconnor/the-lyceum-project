"use client";

import { useEffect } from "react";
import { useUserSettings } from "@/components/providers/settings-provider";
import { useTheme } from "next-themes";

export function FontApplier() {
  const { settings } = useUserSettings();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const font = settings.appearance.font;
    document.body.setAttribute("data-font", font);
    
    // Also set as a cookie for server-side rendering
    document.cookie = `font_preference=${font}; path=/; max-age=31536000; SameSite=Lax; ${window.location.protocol === "https:" ? "Secure;" : ""}`;
  }, [settings.appearance.font]);

  useEffect(() => {
    setTheme(settings.appearance.theme);
  }, [settings.appearance.theme, setTheme]);

  return null;
}
