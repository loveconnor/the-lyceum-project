import React from "react";
import { generateMeta } from "@/lib/utils";

import {
  WelcomeCard,
  TopicsCard,
  LearningPathCard,
  ChartMostActivity,
  ProgressStatisticsCard,
  StudentSuccessCard,
  CourseProgressByMonth,
  RecommendedCoursesTable,
  DashboardAnalytics,
  FirstWeekSuccessLoop
} from "@/components/dashboard";
import { createClient } from "@/utils/supabase/server";

export async function generateMetadata() {
  return generateMeta({
    title: "The Lyceum Project",
    description:
      "The Lyceum Project is an AI-powered learning platform designed to bring personalized, interactive education to everyone.",
    canonical: "/"
  });
}

type DashboardTopic = {
  name: string;
  category: string;
  confidence: string;
  progress: number;
  count?: number;
};

type FirstWeekStatus = {
  onboarding_complete: boolean;
  module_completed: boolean;
  lab_completed: boolean;
  reflection_written: boolean;
};

type DashboardState = {
  user_id: string;
  overall_success_rate: number;
  total_courses: number;
  total_activities: number;
  total_minutes: number;
  most_active_month: string | null;
  progress: number;
  top_topics: DashboardTopic[];
  learning_path: Array<{ id?: string; title?: string; progress?: number; completed?: number; total?: number; status?: string }>;
  recommended_topics: DashboardTopic[];
  stats: {
    activity_counts?: Record<string, number>;
    monthly_activity?: Record<string, number>;
    success_samples?: number;
    in_progress?: number;
    completed?: number;
    previous_success_rate?: number;
    labs_completed?: number;
    labs_in_progress?: number;
    paths_completed?: number;
    paths_in_progress?: number;
  };
  activities?: Array<{ timestamp: string; type: 'lab' | 'path' }>;
  first_week: FirstWeekStatus;
};

const DEFAULT_FIRST_WEEK: FirstWeekStatus = {
  onboarding_complete: false,
  module_completed: false,
  lab_completed: false,
  reflection_written: false
};

const DEFAULT_STATE: DashboardState = {
  user_id: "",
  overall_success_rate: 0,
  total_courses: 0,
  total_activities: 0,
  total_minutes: 0,
  most_active_month: null,
  progress: 0,
  top_topics: [],
  learning_path: [],
  recommended_topics: [],
  stats: {},
  first_week: DEFAULT_FIRST_WEEK
};

type OnboardingInterestsPayload = { interests?: string[] };

const fallbackTopicsFromInterests = (onboarding: unknown, forceConfidence?: string): DashboardTopic[] => {
  const interestsPayload = onboarding as OnboardingInterestsPayload | null;
  const interests: string[] = Array.isArray(interestsPayload?.interests)
    ? interestsPayload.interests
    : [];
  if (!interests.length) return [];

  const uniqueInterests = [...new Set(interests)].filter(Boolean);
  const topics = uniqueInterests.flatMap((interest) => [
    { name: interest, category: "Interest", confidence: forceConfidence || "Based on interests", progress: 0 },
    {
      name: `${interest} fundamentals`,
      category: "Interest",
      confidence: forceConfidence || "Based on interests",
      progress: 0
    }
  ]);

  while (topics.length < 6) {
    topics.push({
      name: `Topic ${topics.length + 1}`,
      category: "General",
      confidence: forceConfidence || "Complete an activity",
      progress: 0
    });
  }

  return topics.slice(0, 6);
};

async function fetchFirstWeekStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<FirstWeekStatus> {
  if (!userId) return DEFAULT_FIRST_WEEK;

  try {
    const [
      { data: profile },
      { count: reflectionCount },
      { data: paths },
      { count: completedLabCount }
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("reflections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("learning_paths")
        .select("id")
        .eq("user_id", userId),
      supabase
        .from("labs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed")
    ]);

    const pathIds = (paths || []).map((path: { id?: string }) => path.id).filter(Boolean) as string[];

    let moduleCompleted = false;
    let labCompleted = (completedLabCount ?? 0) > 0;

    if (pathIds.length > 0) {
      const [{ count: moduleCount }, { count: labCount }] = await Promise.all([
        supabase
          .from("learning_path_items")
          .select("id", { count: "exact", head: true })
          .in("path_id", pathIds)
          .eq("item_type", "module")
          .eq("status", "completed"),
        supabase
          .from("learning_path_items")
          .select("id", { count: "exact", head: true })
          .in("path_id", pathIds)
          .eq("item_type", "lab")
          .eq("status", "completed")
      ]);

      moduleCompleted = (moduleCount ?? 0) > 0;
      labCompleted = labCompleted || (labCount ?? 0) > 0;
    }

    return {
      onboarding_complete: Boolean(profile?.onboarding_complete),
      module_completed: moduleCompleted,
      lab_completed: labCompleted,
      reflection_written: (reflectionCount ?? 0) > 0
    };
  } catch (error) {
    console.warn("First-week status fetch failed", error);
    return DEFAULT_FIRST_WEEK;
  }
}

async function fetchDashboardState(): Promise<DashboardState> {
  const supabase = await createClient();
  const [{ data: sessionData }, { data: userData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser()
  ]);

  const token = sessionData.session?.access_token;
  const userId = userData?.user?.id || sessionData.session?.user?.id || "";
  const baseUrl =
    process.env.BACKEND_URL_INTERNAL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3001";

  if (!token || !userId) {
    return { ...DEFAULT_STATE, user_id: userId, first_week: DEFAULT_FIRST_WEEK };
  }

  try {
    const res = await fetch(`${baseUrl}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });

    if (!res.ok) {
      console.warn("Dashboard fetch failed", res.status);
      const first_week = await fetchFirstWeekStatus(supabase, userId);
      return { ...DEFAULT_STATE, user_id: userId, first_week };
    }

    const data = (await res.json()) as DashboardState;
    const first_week = await fetchFirstWeekStatus(supabase, userId);
    return {
      user_id: data.user_id || userId,
      ...DEFAULT_STATE,
      ...data,
      top_topics: data.top_topics || [],
      learning_path: data.learning_path || [],
      recommended_topics: data.recommended_topics || [],
      stats: data.stats || {},
      first_week: data.first_week ? { ...DEFAULT_FIRST_WEEK, ...data.first_week, ...first_week } : first_week
    };
  } catch (error) {
    // Swallow network errors (e.g., backend not running) and fall back to onboarding-derived data
    console.warn("Dashboard fetch unavailable, falling back to onboarding data");

    try {
      // Fallback: pull onboarding_data directly and synthesize recommendations client-side
      if (!userId) {
        return { ...DEFAULT_STATE, user_id: "", first_week: DEFAULT_FIRST_WEEK };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_data")
        .eq("id", userId)
        .maybeSingle();

      const forceConfidence = "Complete an activity";
      const recommended_topics = fallbackTopicsFromInterests(profile?.onboarding_data, forceConfidence);

      const first_week = await fetchFirstWeekStatus(supabase, userId);
      return {
        ...DEFAULT_STATE,
        user_id: userId,
        recommended_topics,
        first_week
      };
    } catch (fallbackError) {
      console.warn("Dashboard fallback failed", fallbackError);
    }

    const first_week = await fetchFirstWeekStatus(supabase, userId);
    return { ...DEFAULT_STATE, user_id: userId, first_week };
  }
}

export default function Page() {
  const dashboardPromise = fetchDashboardState();

  return (
    <div className="space-y-4">
      {/* Use Suspense to stream dashboard data without blocking shell */}
      <React.Suspense fallback={<DashboardSkeleton />}>
        {/* @ts-expect-error Async Server Component */}
        <DashboardContent dashboardPromise={dashboardPromise} />
      </React.Suspense>
    </div>
  );
}

async function DashboardContent({
  dashboardPromise,
}: {
  dashboardPromise: Promise<DashboardState>;
}) {
  const dashboard = await dashboardPromise;

  // Determine which analytics sections should be shown
  // Only show if there's meaningful data to display
  const hasSuccessData = 
    dashboard.overall_success_rate > 0 || 
    dashboard.total_courses > 0 || 
    (dashboard.stats?.previous_success_rate ?? 0) > 0;
  
  const hasProgressData = 
    (dashboard.stats?.in_progress ?? 0) > 0 || 
    (dashboard.stats?.completed ?? 0) > 0;
  
  const hasTopTopicsData = 
    dashboard.top_topics && 
    dashboard.top_topics.length > 0 && 
    dashboard.top_topics.some(topic => topic.progress > 0 || topic.count);
  
  const hasActivityData = 
    dashboard.stats?.activity_counts && 
    Object.values(dashboard.stats.activity_counts).some(count => count > 0);
  
  const hasTimeSeriesData = 
    dashboard.activities && 
    dashboard.activities.length > 0;

  return (
    <>
      {/* Client-side analytics for dashboard usage */}
      <DashboardAnalytics dashboard_variant="main" />
      {/* Top section - dynamic layout based on what's visible */}
      <div className={`grid gap-4 ${hasTopTopicsData ? 'lg:grid-cols-12' : 'lg:grid-cols-2'}`}>
        <div className={hasTopTopicsData ? 'lg:col-span-12 xl:col-span-6' : 'lg:col-span-1'}>
          <WelcomeCard />
        </div>
        <div className={hasTopTopicsData ? 'lg:col-span-6 xl:col-span-3' : 'lg:col-span-1'}>
          <LearningPathCard learningPath={dashboard.learning_path} progress={dashboard.progress} />
        </div>
        {hasTopTopicsData && (
          <div className="lg:col-span-6 xl:col-span-3">
            <TopicsCard topics={dashboard.top_topics} />
          </div>
        )}
      </div>

      <FirstWeekSuccessLoop status={dashboard.first_week} />
      
      {/* Analytics sections - only show if there's data */}
      {(hasSuccessData || hasProgressData || hasActivityData) && (() => {
        const visibleCardsCount = [hasSuccessData, hasProgressData, hasActivityData].filter(Boolean).length;
        const gridClass = visibleCardsCount === 1 
          ? "grid gap-4" 
          : visibleCardsCount === 2 
            ? "grid gap-4 lg:grid-cols-2" 
            : "grid gap-4 lg:grid-cols-2 xl:grid-cols-3";
        
        return (
          <div className={gridClass}>
            {hasSuccessData && (
              <StudentSuccessCard
                currentSuccessRate={dashboard.overall_success_rate ?? 0}
                previousSuccessRate={dashboard.stats?.previous_success_rate ?? 0}
                totalStudents={dashboard.total_courses || 0}
                passingStudents={Math.round((dashboard.total_courses || 0) * (dashboard.overall_success_rate / 100 || 0))}
              />
            )}
            {hasProgressData && (
              <ProgressStatisticsCard
                totalActivity={dashboard.progress || 0}
                inProgress={dashboard.stats?.in_progress ?? 0}
                completed={dashboard.stats?.completed ?? 0}
                labsCompleted={dashboard.stats?.labs_completed}
                labsInProgress={dashboard.stats?.labs_in_progress}
                pathsCompleted={dashboard.stats?.paths_completed}
                pathsInProgress={dashboard.stats?.paths_in_progress}
              />
            )}
            {hasActivityData && (
              <ChartMostActivity activityCounts={dashboard.stats?.activity_counts || {}} />
            )}
          </div>
        );
      })()}
      
      {/* Time series and recommendations - dynamic layout */}
      <div className={`mt-4 gap-4 space-y-4 ${hasTimeSeriesData ? 'xl:grid xl:grid-cols-2' : ''} xl:space-y-0`}>
        {hasTimeSeriesData && (
          <CourseProgressByMonth activities={dashboard.activities || []} />
        )}
        <div className={!hasTimeSeriesData ? 'w-full' : ''}>
          <RecommendedCoursesTable
            key={dashboard.user_id || "anonymous"}
            userId={dashboard.user_id}
            topics={dashboard.recommended_topics}
          />
        </div>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="bg-muted animate-pulse rounded-lg lg:col-span-12 xl:col-span-6 h-64" />
        <div className="bg-muted animate-pulse rounded-lg lg:col-span-6 xl:col-span-3 h-64" />
        <div className="bg-muted animate-pulse rounded-lg lg:col-span-6 xl:col-span-3 h-64" />
      </div>
      <div className="bg-muted animate-pulse rounded-lg h-36" />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="bg-muted animate-pulse rounded-lg h-64" />
        <div className="bg-muted animate-pulse rounded-lg h-64" />
        <div className="bg-muted animate-pulse rounded-lg h-64" />
      </div>
      <div className="mt-4 gap-4 space-y-4 xl:grid xl:grid-cols-2 xl:space-y-0">
        <div className="bg-muted animate-pulse rounded-lg h-72" />
        <div className="bg-muted animate-pulse rounded-lg h-72" />
      </div>
    </div>
  );
}
