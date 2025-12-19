import { Router } from 'express';

import {
  generateOnboardingRecommendations,
  generateTopicRecommendations,
  type OnboardingRecommendations,
  type TopicRecommendation,
} from '../ai';
import { getSupabaseAdmin } from '../supabaseAdmin';

type DashboardTopic = TopicRecommendation & { progress: number; count?: number };

type DashboardState = {
  user_id: string;
  overall_success_rate: number;
  total_courses: number;
  total_activities: number;
  total_minutes: number;
  most_active_month: string | null;
  progress: number;
  top_topics: DashboardTopic[];
  learning_path: unknown[];
  recommended_topics: DashboardTopic[];
  stats: Record<string, any>;
  activities?: Array<{ timestamp: string; type: 'lab' | 'path' }>;
  last_recomputed_at?: string;
  created_at?: string;
  updated_at?: string;
};

const defaultState = (userId: string): DashboardState => ({
  user_id: userId,
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
});

const normalizeTopics = (
  topics: Array<TopicRecommendation | OnboardingRecommendations['recommendations'][number]> = [],
  {
    forceConfidence,
    progress,
    padToSix = true,
  }: { forceConfidence?: string; progress?: number; padToSix?: boolean } = {},
): DashboardTopic[] => {
  const normalized = topics.slice(0, 6).map((t) => ({
    name: (t as any).name || (t as any).title || 'Topic',
    category:
      (t as any).category ||
      (t as any).difficulty ||
      ((t as any).suggested_formats?.[0] as string | undefined) ||
      'General',
    confidence:
      forceConfidence ||
      (t as any).confidence ||
      (typeof (t as any).estimated_hours === 'number'
        ? `~${(t as any).estimated_hours} hrs`
        : (t as any).rationale || 'Suggested'),
    progress: typeof progress === 'number' ? progress : (t as any).progress ?? 0,
  }));

  if (padToSix) {
    while (normalized.length < 6) {
      normalized.push({
        name: `Topic ${normalized.length + 1}`,
        category: 'General',
        confidence: forceConfidence || 'Complete an activity',
        progress: typeof progress === 'number' ? progress : 0,
      });
    }
  }

  return normalized;
};

const computeMostActiveMonth = (monthlyActivity: Record<string, number>): string | null => {
  const entries = Object.entries(monthlyActivity || {});
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
};

const getOnboardingData = async (userId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_data')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch onboarding_data', error);
    return null;
  }

  return data?.onboarding_data ?? null;
};

const fallbackTopicsFromInterests = (
  onboarding: any,
  forceConfidence?: string,
): TopicRecommendation[] => {
  const interests: string[] = Array.isArray(onboarding?.interests) ? onboarding.interests : [];
  if (!interests.length) {
    return [];
  }

  const uniqueInterests = [...new Set(interests)].filter(Boolean);
  const expanded: TopicRecommendation[] = uniqueInterests.flatMap((interest) => [
    { name: interest, category: 'Interest', confidence: forceConfidence || 'Based on interests' },
    {
      name: `${interest} fundamentals`,
      category: 'Interest',
      confidence: forceConfidence || 'Based on interests',
    },
  ]);

  return expanded.slice(0, 6);
};

const isFallbackRecommendations = (topics: DashboardTopic[] = []) => {
  if (!topics.length) return true;
  const placeholders = topics.some((t) => (t.name || '').toLowerCase().startsWith('topic '));
  const basedOnInterests = topics.every(
    (t) => (t.confidence || '').toLowerCase().includes('based on interests'),
  );
  return placeholders || basedOnInterests;
};

const getOrCreateState = async (userId: string): Promise<DashboardState> => {
  const supabase = getSupabaseAdmin();

  const { data: existing, error } = await supabase
    .from('dashboard_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existing) return existing as DashboardState;

  const initial = defaultState(userId);
  const { data: inserted, error: insertError } = await supabase
    .from('dashboard_state')
    .insert(initial)
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted as DashboardState;
};

const ensureRecommendations = async (
  state: DashboardState,
  { forceRefresh = false }: { forceRefresh?: boolean } = {},
): Promise<DashboardState> => {
  if (state.recommended_topics && state.recommended_topics.length && !forceRefresh) {
    if (!isFallbackRecommendations(state.recommended_topics)) {
      return state;
    }
  }

  const onboarding = await getOnboardingData(state.user_id);
  const forceConfidence = state.total_courses === 0 ? 'Complete an activity' : undefined;

  // Primary: AI course recommendations
  let recommendedTopics: DashboardTopic[] = [];
  try {
    const recs = await generateOnboardingRecommendations(onboarding || {});
    if (recs?.recommendations?.length) {
      recommendedTopics = normalizeTopics(recs.recommendations, {
        forceConfidence,
        progress: 0,
        padToSix: false,
      });
    }
  } catch (err) {
    console.error('Onboarding recommendations failed, falling back to topics', err);
  }

  // Secondary: Topic recommendations
  if (recommendedTopics.length < 6) {
    try {
      const topics = await generateTopicRecommendations(onboarding || {});
      if (topics?.length) {
        const more = normalizeTopics(topics, { forceConfidence, progress: 0, padToSix: false });
        const existingNames = new Set(recommendedTopics.map((t) => (t.name || '').toLowerCase()));
        recommendedTopics = [
          ...recommendedTopics,
          ...more.filter((t) => !existingNames.has((t.name || '').toLowerCase())),
        ].slice(0, 6);
      }
    } catch (err) {
      console.error('Topic recommendations failed, falling back to interests', err);
    }
  }

  // Tertiary: Interest-based fallback
  if (recommendedTopics.length < 6) {
    const interestTopics = normalizeTopics(
      fallbackTopicsFromInterests(onboarding, forceConfidence),
      {
        forceConfidence,
        progress: 0,
        padToSix: false,
      },
    );
    const existingNames = new Set(recommendedTopics.map((t) => (t.name || '').toLowerCase()));
    recommendedTopics = [
      ...recommendedTopics,
      ...interestTopics.filter((t) => !existingNames.has((t.name || '').toLowerCase())),
    ].slice(0, 6);
  }

  // Final safety net
  if (recommendedTopics.length < 6) {
    recommendedTopics = normalizeTopics(
      [
        { name: 'Learning Skills', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Study Habits', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Problem Solving', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Critical Thinking', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Communication', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Project Execution', category: 'General', confidence: forceConfidence || 'Suggested' },
      ],
      { forceConfidence, progress: 0, padToSix: false },
    );
  }

  // If still short, pad to 6 with placeholders
  if (recommendedTopics.length < 6) {
    recommendedTopics = normalizeTopics(recommendedTopics, { forceConfidence, progress: 0 });
  }

  const supabase = getSupabaseAdmin();
  const { data: updated, error } = await supabase
    .from('dashboard_state')
    .update({
      recommended_topics: recommendedTopics,
      last_recomputed_at: new Date().toISOString(),
      progress: 0,
    })
    .eq('user_id', state.user_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return updated as DashboardState;
};

const recalculateStatsFromLabs = async (userId: string): Promise<Partial<DashboardState>> => {
  const supabase = getSupabaseAdmin();
  
  // Fetch all labs for this user
  const { data: labs, error } = await supabase
    .from('labs')
    .select('id, status, topics, estimated_duration, completed_at, created_at')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching labs for stats:', error);
    return {};
  }

  if (!labs || labs.length === 0) {
    return {};
  }

  // Calculate statistics
  const completedLabs = labs.filter(l => l.status === 'completed');
  const inProgressLabs = labs.filter(l => l.status === 'in-progress');
  const notStartedLabs = labs.filter(l => l.status === 'not-started');
  
  // Calculate success rate: (completed / (completed + in-progress)) * 100
  // This shows the success rate of labs you've actually engaged with
  const engagedLabs = completedLabs.length + inProgressLabs.length;
  const successRate = engagedLabs > 0 
    ? (completedLabs.length / engagedLabs) * 100 
    : 0;
  
  let totalMinutes = 0;
  const topicCounts: Record<string, number> = {};
  const monthlyActivity: Record<string, { labs: number; paths: number }> = {};

  // Process completed labs
  completedLabs.forEach(lab => {
    // Add minutes
    if (lab.estimated_duration) {
      totalMinutes += lab.estimated_duration;
    }

    // Count topics
    if (lab.topics && Array.isArray(lab.topics)) {
      lab.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    }

    // Monthly activity with lab tracking
    if (lab.completed_at) {
      const monthKey = lab.completed_at.slice(0, 7);
      if (!monthlyActivity[monthKey]) {
        monthlyActivity[monthKey] = { labs: 0, paths: 0 };
      }
      monthlyActivity[monthKey].labs += 1;
    }
  });

  // Convert topic counts to dashboard format
  const topTopics: DashboardTopic[] = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({
      name,
      category: 'Topic',
      confidence: 'From activity',
      progress: Math.min(100, count * 20), // 20% per completion, max 100%
      count
    }));

  // Calculate activity counts
  const activityCounts = {
    lab_completed: completedLabs.length,
    lab_started: inProgressLabs.length,
  };

  return {
    total_courses: completedLabs.length,
    total_activities: labs.length,
    total_minutes: totalMinutes,
    overall_success_rate: Math.round(successRate),
    top_topics: topTopics,
    most_active_month: computeMostActiveMonth(monthlyActivity),
    stats: {
      activity_counts: activityCounts,
      monthly_activity: monthlyActivity,
      success_samples: completedLabs.length,
      total_students: 1, // Single user
      passing_students: completedLabs.length > 0 ? 1 : 0,
      // Frontend expects these fields
      in_progress: inProgressLabs.length,
      completed: completedLabs.length,
    }
  };
};

const router = Router();

router.get('/', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let state = await getOrCreateState(userId);
    
    // Always recalculate from labs to ensure stats are up-to-date
    const recalculated = await recalculateStatsFromLabs(userId);
    
    if (Object.keys(recalculated).length > 0) {
      // Update dashboard state with recalculated values
      const supabase = getSupabaseAdmin();
      const { data: updated, error } = await supabase
        .from('dashboard_state')
        .update(recalculated)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (!error && updated) {
        state = updated as DashboardState;
      }
    }
    
    // Fetch activities for the chart
    const supabase = getSupabaseAdmin();
    const activities: Array<{ timestamp: string; type: 'lab' | 'path' }> = [];
    
    // Get completed labs
    const { data: labs } = await supabase
      .from('labs')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null);
    
    if (labs) {
      activities.push(...labs.map(l => ({ 
        timestamp: l.completed_at!, 
        type: 'lab' as const 
      })));
    }
    
    // Get completed paths
    const { data: paths } = await supabase
      .from('learning_paths')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null);
    
    if (paths) {
      activities.push(...paths.map(p => ({ 
        timestamp: p.completed_at!, 
        type: 'path' as const 
      })));
    }
    
    // Sort by timestamp
    activities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const withRecs = await ensureRecommendations(state);
    res.json({ ...withRecs, activities });
  } catch (error: any) {
    console.error('Dashboard fetch error', error);
    res.status(500).json({ error: 'Failed to fetch dashboard state', details: error?.message });
  }
});

router.post('/activity', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { activityType, minutes = 0, topic, successRate } = req.body || {};

  try {
    const state = await getOrCreateState(userId);
    const supabase = getSupabaseAdmin();

    const stats = state.stats || {};
    const activityCounts: Record<string, number> = stats.activity_counts || {};
    const monthlyActivity: Record<string, number> = stats.monthly_activity || {};
    const successSamples: number = stats.success_samples || 0;

    const activityKey = activityType || 'activity';
    activityCounts[activityKey] = (activityCounts[activityKey] || 0) + 1;

    const minuteValue = Number(minutes) || 0;
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7); // YYYY-MM
    monthlyActivity[monthKey] = (monthlyActivity[monthKey] || 0) + 1;

    let overall_success_rate = state.overall_success_rate;
    if (typeof successRate === 'number') {
      overall_success_rate =
        (overall_success_rate * successSamples + successRate) / (successSamples + 1);
      stats.success_samples = successSamples + 1;
    }

    stats.activity_counts = activityCounts;
    stats.monthly_activity = monthlyActivity;

    const top_topics: DashboardTopic[] = Array.isArray(state.top_topics)
      ? [...state.top_topics]
      : [];

    if (topic) {
      const existingIndex = top_topics.findIndex((t) => t.name === topic);
      if (existingIndex >= 0) {
        top_topics[existingIndex].count = (top_topics[existingIndex].count || 0) + 1;
      } else {
        top_topics.push({ name: topic, category: 'General', confidence: 'n/a', progress: 0, count: 1 });
      }
    }

    const sortedTopTopics = top_topics
      .map((t) => ({ ...t, count: t.count || 1 }))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 6);

    const updatedPayload: Partial<DashboardState> = {
      total_activities: state.total_activities + 1,
      total_minutes: state.total_minutes + minuteValue,
      total_courses: state.total_courses + (activityType === 'course_completed' ? 1 : 0),
      overall_success_rate,
      top_topics: sortedTopTopics,
      stats,
      most_active_month: computeMostActiveMonth(monthlyActivity),
    };

    const { data: updated, error } = await supabase
      .from('dashboard_state')
      .update(updatedPayload)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Dashboard activity error', error);
    res.status(500).json({ error: 'Failed to record activity', details: error?.message });
  }
});

router.post('/recommendations/regenerate', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseAdmin();

    // clear current recommendations to force regeneration
    await supabase.from('dashboard_state').update({ recommended_topics: [] }).eq('user_id', userId);

    const state = await getOrCreateState(userId);
    const refreshed = await ensureRecommendations({ ...state, recommended_topics: [] }, { forceRefresh: true });

    res.json(refreshed);
  } catch (error: any) {
    console.error('Dashboard regenerate error', error);
    res.status(500).json({ error: 'Failed to regenerate recommendations', details: error?.message });
  }
});

router.post('/recalculate', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const recalculated = await recalculateStatsFromLabs(userId);
    
    if (Object.keys(recalculated).length === 0) {
      return res.json({ message: 'No labs found to calculate from' });
    }

    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from('dashboard_state')
      .update(recalculated)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ message: 'Dashboard recalculated successfully', data: updated });
  } catch (error: any) {
    console.error('Dashboard recalculate error', error);
    res.status(500).json({ error: 'Failed to recalculate dashboard', details: error?.message });
  }
});

export default router;
