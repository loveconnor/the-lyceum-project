"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook to refresh the dashboard page when labs are updated
 * This is needed because the dashboard is a server component with cached data
 */
export function useDashboardRefresh() {
  const router = useRouter();

  const refreshDashboard = useCallback(() => {
    router.refresh();
  }, [router]);

  return refreshDashboard;
}
