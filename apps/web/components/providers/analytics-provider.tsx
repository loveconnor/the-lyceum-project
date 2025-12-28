"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { endSession, initAnalytics, isAnalyticsEnabled, startSession, trackPageview } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const analyticsConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
    process.env.NEXT_PUBLIC_POSTHOG_DISABLED !== "true";

  useEffect(() => {
    if (!analyticsConfigured) return;
    initAnalytics();
    startSession();

    return () => {
      endSession();
    };
  }, [analyticsConfigured]);

  useEffect(() => {
    if (!analyticsConfigured || !isAnalyticsEnabled()) return;
    trackPageview();
  }, [pathname, searchParams, analyticsConfigured]);

  return <>{children}</>;
}
