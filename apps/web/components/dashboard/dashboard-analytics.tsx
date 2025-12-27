"use client";

import { useEffect } from "react";
import { markPrimaryFeature, trackEvent } from "@/lib/analytics";

export function DashboardAnalytics({ variant = "main" }: { variant?: string }) {
  useEffect(() => {
    trackEvent("dashboard_viewed", { dashboard_variant: variant });
    markPrimaryFeature("dashboard");
  }, [variant]);

  return null;
}
