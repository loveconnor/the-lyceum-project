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
  RecommendedCoursesTable
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

type DashboardState = {
  user_id: string;
  overall_success_rate: number;
  total_courses: number;
  total_activities: number;
  total_minutes: number;
  most_active_month: string | null;
  progress: number;
  top_topics: DashboardTopic[];
  learning_path: Array<{ title?: string; progress?: number; completed?: number; total?: number }>;
  recommended_topics: DashboardTopic[];
  stats: {
    activity_counts?: Record<string, number>;
    monthly_activity?: Record<string, number>;
    success_samples?: number;
    in_progress?: number;
    completed?: number;
    previous_success_rate?: number;
  };
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
};

const fallbackTopicsFromInterests = (onboarding: any, forceConfidence?: string): DashboardTopic[] => {
  const interests: string[] = Array.isArray(onboarding?.interests) ? onboarding.interests : [];
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

  if (!token || !userId) return { ...DEFAULT_STATE, user_id: userId };

  try {
    const res = await fetch(`${baseUrl}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });

    if (!res.ok) {
      console.warn("Dashboard fetch failed", res.status);
      return { ...DEFAULT_STATE, user_id: userId };
    }

    const data = (await res.json()) as DashboardState;
    return {
      user_id: data.user_id || userId,
      ...DEFAULT_STATE,
      ...data,
      top_topics: data.top_topics || [],
      learning_path: data.learning_path || [],
      recommended_topics: data.recommended_topics || [],
      stats: data.stats || {},
    };
  } catch (error) {
    // Swallow network errors (e.g., backend not running) and fall back to onboarding-derived data
    console.warn("Dashboard fetch unavailable, falling back to onboarding data");

    try {
      // Fallback: pull onboarding_data directly and synthesize recommendations client-side
      if (!userId) {
        return { ...DEFAULT_STATE, user_id: "" };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_data")
        .eq("id", userId)
        .maybeSingle();

      const forceConfidence = "Complete an activity";
      const recommended_topics = fallbackTopicsFromInterests(profile?.onboarding_data, forceConfidence);

      return {
        ...DEFAULT_STATE,
        user_id: userId,
        recommended_topics,
      };
    } catch (fallbackError) {
      console.warn("Dashboard fallback failed", fallbackError);
    }

    return { ...DEFAULT_STATE, user_id: userId };
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

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12 xl:col-span-6">
          <WelcomeCard />
        </div>
        <div className="lg:col-span-6 xl:col-span-3">
          <LearningPathCard learningPath={dashboard.learning_path} progress={dashboard.progress} />
        </div>
        <div className="lg:col-span-6 xl:col-span-3">
          <TopicsCard topics={dashboard.top_topics} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <StudentSuccessCard
          currentSuccessRate={dashboard.overall_success_rate ?? 0}
          previousSuccessRate={dashboard.stats?.previous_success_rate ?? 0}
          totalStudents={dashboard.total_courses || 0}
          passingStudents={Math.round((dashboard.total_courses || 0) * (dashboard.overall_success_rate / 100 || 0))}
        />
        <ProgressStatisticsCard
          totalActivity={dashboard.progress || 0}
          inProgress={dashboard.stats?.in_progress ?? 0}
          completed={dashboard.stats?.completed ?? 0}
        />
        <ChartMostActivity activityCounts={dashboard.stats?.activity_counts || {}} />
      </div>
      <div className="mt-4 gap-4 space-y-4 xl:grid xl:grid-cols-2 xl:space-y-0">
        <CourseProgressByMonth monthlyActivity={dashboard.stats?.monthly_activity || {}} />
        <RecommendedCoursesTable
          key={dashboard.user_id || "anonymous"}
          userId={dashboard.user_id}
          topics={dashboard.recommended_topics}
        />
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
