import { useState } from "react";
import { getLabAIAssistance } from "@/lib/api/labs";
import { ANALYTICS_CONFIG } from "@/lib/analytics/config";
import { markAiUsed, trackEvent } from "@/lib/analytics";

export function useLabAI(labId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAssistance = async (prompt: string, context?: any): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      markAiUsed();
      trackEvent("ai_widget_used", {
        context: "lab",
        widget_type: "text",
        model_tier: ANALYTICS_CONFIG.defaultModelTier
      });

      const response = await getLabAIAssistance(labId, prompt, context);
      return response.assistance;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    getAssistance,
    loading,
    error,
  };
}
