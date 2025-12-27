"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { endSession, initAnalytics, isAnalyticsEnabled, startSession, trackPageview } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
    startSession();

    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    trackPageview();
  }, [pathname, searchParams]);

  return <>{children}</>;
}
