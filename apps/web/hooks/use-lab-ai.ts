import { useState } from "react";
import { getLabAIAssistance } from "@/lib/api/labs";

export function useLabAI(labId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAssistance = async (prompt: string, context?: any): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
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
