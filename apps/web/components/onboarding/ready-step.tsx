"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/app/onboarding/store";
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Clock, BookOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { ANALYTICS_CONFIG } from "@/lib/analytics/config";
import { markPrimaryFeature, trackEvent } from "@/lib/analytics";

export function AccountTypeStep() {
  const supabase = createClient();
  const router = useRouter();
  const { data, prevStep, reset, startedAt, skippedSteps } = useOnboardingStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPath, setIsCreatingPath] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    title: string;
    summary: string;
    rationale: string;
    difficulty: string;
    estimated_hours?: number;
  } | null>(null);

  useEffect(() => {
    generateRecommendation();
  }, []);

  const generateRecommendation = async () => {
    setIsLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${backendUrl}/ai/onboarding/recommendations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ onboardingData: data })
      });

      if (!response.ok) throw new Error('Failed to generate recommendation');
      
      const result = await response.json();
      // Get the first and best recommendation
      if (result.recommendations && result.recommendations.length > 0) {
        setRecommendation(result.recommendations[0]);
      }
    } catch (error: unknown) {
      console.error('Error generating recommendation:', error);
      toast.error('Failed to generate recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartLearning = async () => {
    if (!recommendation) return;
    
    setIsCreatingPath(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('You must be signed in.');

      // Mark onboarding as complete
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        onboarding_complete: true,
        onboarding_data: data
      });
      if (profileError) throw new Error(profileError.message);

      // Create the learning path
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const { data: { session } } = await supabase.auth.getSession();
      
      const pathResponse = await fetch(`${backendUrl}/paths/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          title: recommendation.title,
          description: recommendation.summary,
          difficulty: recommendation.difficulty || 'intermediate',
          estimatedDuration: recommendation.estimated_hours || 25, // Already in hours
          topics: data.interests || []
        })
      });

      if (!pathResponse.ok) throw new Error('Failed to create learning path');
      
      const pathData = (await pathResponse.json()) as {
        id: string;
        learning_path_items?: Array<{ item_type?: string }>;
        modules?: unknown[];
      };

      const totalLabs =
        Array.isArray(pathData?.learning_path_items)
          ? pathData.learning_path_items.filter((item) => item.item_type === "lab").length
          : Array.isArray(pathData?.modules)
            ? pathData.modules.length
            : null;
      const topicDomain = data.interests?.[0] || null;
      const timeToCompleteSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;

      trackEvent("onboarding_completed", {
        onboarding_version: ANALYTICS_CONFIG.onboardingVersion,
        skipped_steps: skippedSteps,
        time_to_complete_seconds: timeToCompleteSeconds
      });

      trackEvent("learning_path_created", {
        path_id: pathData.id,
        generated_by_ai: true,
        topic_domain: topicDomain,
        difficulty_level: recommendation.difficulty || "intermediate",
        total_labs: totalLabs
      });

      trackEvent("activation_completed", {
        path_id: pathData.id,
        generated_by_ai: true,
        topic_domain: topicDomain,
        difficulty_level: recommendation.difficulty || "intermediate",
        total_labs: totalLabs
      });

      markPrimaryFeature("learning_path");
      toast.success("Your learning path is ready!");
      reset();
      
      // Navigate to the new learning path
      router.push(`/paths/${pathData.id}`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to create learning path";
      toast.error(message || "Unable to create learning path");
      setIsCreatingPath(false);
    }
  };

  const handleSkipToExplore = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('You must be signed in.');

      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        onboarding_complete: true,
        onboarding_data: data
      });
      if (upsertError) throw new Error(upsertError.message);

      const timeToCompleteSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
      trackEvent("onboarding_completed", {
        onboarding_version: ANALYTICS_CONFIG.onboardingVersion,
        skipped_steps: true,
        time_to_complete_seconds: timeToCompleteSeconds
      });

      toast.success("Welcome to Lyceum!");
      reset();
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to finish onboarding";
      toast.error(message || "Unable to finish onboarding");
    }
  };

  return (
    <div className="flex h-screen flex-col px-4 overflow-hidden relative">
      <div className="flex flex-col items-center justify-center flex-1">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-normal">Your learning path is ready</h1>
            <p className="text-muted-foreground">
              Based on your interests and experience, here&apos;s a great place to start
            </p>
          </div>

          {/* Main Recommendation Card */}
          {isLoading ? (
            <Card className="border-2">
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center space-y-4 min-h-[200px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Creating your personalized path...</p>
                </div>
              </CardContent>
            </Card>
          ) : recommendation ? (
            <Card className="border-2 border-primary/50 bg-primary/5">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-primary">Recommended for you</div>
                  <h2 className="text-2xl font-semibold">{recommendation.title}</h2>
                  <p className="text-muted-foreground">{recommendation.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <div className="font-medium">~{recommendation.estimated_hours || 25} hours</div>
                      <div className="text-muted-foreground">Estimated time</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <div className="font-medium capitalize">{recommendation.difficulty}</div>
                      <div className="text-muted-foreground">Difficulty level</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    size="lg" 
                    className="w-full" 
                    onClick={handleStartLearning}
                    disabled={isCreatingPath}
                  >
                    {isCreatingPath ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating your path...
                      </>
                    ) : (
                      "Start Learning"
                    )}
                  </Button>

                  {/* Why this? */}
                  <button
                    onClick={() => setShowWhy(!showWhy)}
                    className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Why am I seeing this?</span>
                    {showWhy ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showWhy && (
                    <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-200">
                      {recommendation.rationale}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2">
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">Unable to generate recommendation</p>
                  <Button variant="outline" onClick={generateRecommendation}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Secondary Options */}
          <div className="flex flex-col items-center gap-3 pt-4">
            <p className="text-sm text-muted-foreground">Or explore on your own:</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <button
                onClick={handleSkipToExplore}
                className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                disabled={isCreatingPath}
              >
                Browse learning paths
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                onClick={handleSkipToExplore}
                className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                disabled={isCreatingPath}
              >
                Jump into a lab
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                onClick={handleSkipToExplore}
                className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                disabled={isCreatingPath}
              >
                Explore topics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
