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
  { forceConfidence, progress }: { forceConfidence?: string; progress?: number } = {},
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

  // If fewer than 6, pad with placeholders to avoid empty state
  while (normalized.length < 6) {
    normalized.push({
      name: `Topic ${normalized.length + 1}`,
      category: 'General',
      confidence: forceConfidence || 'Complete an activity',
      progress: typeof progress === 'number' ? progress : 0,
    });
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
      recommendedTopics = normalizeTopics(recs.recommendations, { forceConfidence, progress: 0 });
    }
  } catch (err) {
    console.error('Onboarding recommendations failed, falling back to topics', err);
  }

  // Secondary: Topic recommendations
  if (!recommendedTopics.length) {
    try {
      const topics = await generateTopicRecommendations(onboarding || {});
      if (topics.length) {
        recommendedTopics = normalizeTopics(topics, { forceConfidence, progress: 0 });
      }
    } catch (err) {
      console.error('Topic recommendations failed, falling back to interests', err);
    }
  }

  // Tertiary: Interest-based fallback
  if (!recommendedTopics.length) {
    recommendedTopics = normalizeTopics(fallbackTopicsFromInterests(onboarding, forceConfidence), {
      forceConfidence,
      progress: 0,
    });
  }

  // Final safety net
  if (!recommendedTopics.length) {
    recommendedTopics = normalizeTopics(
      [
        { name: 'Learning Skills', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Study Habits', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Problem Solving', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Critical Thinking', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Communication', category: 'General', confidence: forceConfidence || 'Suggested' },
        { name: 'Project Execution', category: 'General', confidence: forceConfidence || 'Suggested' },
      ],
      { forceConfidence, progress: 0 },
    );
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

const router = Router();

router.get('/', async (req, res) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const state = await getOrCreateState(userId);
    const withRecs = await ensureRecommendations(state);
    res.json(withRecs);
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

export default router;
