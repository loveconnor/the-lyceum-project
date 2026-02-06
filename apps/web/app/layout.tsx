import React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import GoogleAnalyticsInit from "@/lib/ga";
import { fontVariables } from "@/lib/fonts";
import NextTopLoader from "nextjs-toploader";

import "./globals.css";
import "katex/dist/katex.min.css";

import { ActiveThemeProvider } from "@/components/active-theme";
import { DEFAULT_THEME } from "@/lib/themes";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { LANGUAGE_COOKIE_NAME, getLocaleFromString } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "The Lyceum Project",
  description: "A modern learning platform",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const readThemeValue = <K extends keyof typeof DEFAULT_THEME>(
    key: K,
    cookieKey: string
  ): (typeof DEFAULT_THEME)[K] =>
    (cookieStore.get(cookieKey)?.value ?? DEFAULT_THEME[key]) as (typeof DEFAULT_THEME)[K];

  const locale = getLocaleFromString(cookieStore.get(LANGUAGE_COOKIE_NAME)?.value ?? null);
  const themeSettings = {
    preset: readThemeValue("preset", "theme_preset"),
    scale: readThemeValue("scale", "theme_scale"),
    radius: readThemeValue("radius", "theme_radius"),
    contentLayout: readThemeValue("contentLayout", "theme_content_layout")
  };
  
  // Get font preference from cookies
  const fontPreference = cookieStore.get("font_preference")?.value ?? "inter";

  const bodyAttributes = Object.fromEntries(
    Object.entries(themeSettings)
      .filter(([, value]) => value)
      .map(([key, value]) => [`data-theme-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, value])
  );

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn("bg-background group/layout font-sans", fontVariables)}
        data-font={fontPreference}
        {...bodyAttributes}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange>
          <AnalyticsProvider>
            <ActiveThemeProvider initialTheme={themeSettings}>
              {children}
              <Toaster position="top-center" richColors />
              <NextTopLoader color="var(--primary)" showSpinner={false} height={2} shadow-sm="none" />
              {process.env.NODE_ENV === "production" ? <GoogleAnalyticsInit /> : null}
            </ActiveThemeProvider>
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
