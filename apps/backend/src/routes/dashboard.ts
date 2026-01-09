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
  const normalized = topics.slice(0, 6).map((t) => {
    const name = (t as any).name || (t as any).title || 'Topic';
    const category = (t as any).category ||
      (t as any).difficulty ||
      ((t as any).suggested_formats?.[0] as string | undefined) ||
      'General';
    return {
      name,
      category,
      confidence:
        forceConfidence ||
        (t as any).confidence ||
        (typeof (t as any).estimated_hours === 'number'
          ? `~${(t as any).estimated_hours} hrs`
          : (t as any).rationale || 'Suggested'),
      progress: typeof progress === 'number' ? progress : (t as any).progress ?? 0,
      description: (t as any).summary || (t as any).description || `Learn ${name} fundamentals and core concepts at ${category.toLowerCase()} level.`,
    };
  });

  if (padToSix) {
    while (normalized.length < 6) {
      normalized.push({
        name: `Topic ${normalized.length + 1}`,
        category: 'General',
        confidence: forceConfidence || 'Complete an activity',
        progress: typeof progress === 'number' ? progress : 0,
        description: 'Complete an activity to get personalized recommendations based on your learning goals.',
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
    { 
      name: interest, 
      category: 'Interest', 
      confidence: forceConfidence || 'Based on interests',
      description: `Explore ${interest} and develop practical skills in this area of interest.`,
    },
    {
      name: `${interest} fundamentals`,
      category: 'Interest',
      confidence: forceConfidence || 'Based on interests',
      description: `Master the core fundamentals and essential concepts of ${interest}.`,
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
  console.log('[ENSURE_RECS] Starting ensureRecommendations, forceRefresh:', forceRefresh);
  console.log('[ENSURE_RECS] Current recommended_topics count:', state.recommended_topics?.length || 0);
  
  if (state.recommended_topics && state.recommended_topics.length && !forceRefresh) {
    if (!isFallbackRecommendations(state.recommended_topics)) {
      console.log('[ENSURE_RECS] Existing recommendations found and not forcing refresh, returning state');
      return state;
    }
  }

  console.log('[ENSURE_RECS] Getting onboarding data for user:', state.user_id);
  const onboarding = await getOnboardingData(state.user_id);
  console.log('[ENSURE_RECS] Got onboarding data:', onboarding ? 'exists' : 'null');
  
  const forceConfidence = state.total_courses === 0 ? 'Complete an activity' : undefined;
  console.log('[ENSURE_RECS] Force confidence:', forceConfidence);

  // Primary: AI course recommendations
  let recommendedTopics: DashboardTopic[] = [];
  try {
    console.log('[ENSURE_RECS] Calling generateOnboardingRecommendations...');
    const recs = await generateOnboardingRecommendations(onboarding || {});
    console.log('[ENSURE_RECS] Got onboarding recommendations:', recs?.recommendations?.length || 0);
    
    if (recs?.recommendations?.length) {
      recommendedTopics = normalizeTopics(recs.recommendations, {
        forceConfidence,
        progress: 0,
        padToSix: false,
      });
      console.log('[ENSURE_RECS] Normalized to:', recommendedTopics.length, 'topics');
    }
  } catch (err) {
    console.error('[ENSURE_RECS] Onboarding recommendations failed, falling back to topics', err);
  }

  // Secondary: Topic recommendations
  if (recommendedTopics.length < 6) {
    console.log('[ENSURE_RECS] Need more topics, calling generateTopicRecommendations...');
    try {
      const topics = await generateTopicRecommendations(onboarding || {});
      console.log('[ENSURE_RECS] Got topic recommendations:', topics?.length || 0);
      
      if (topics?.length) {
        const more = normalizeTopics(topics, { forceConfidence, progress: 0, padToSix: false });
        const existingNames = new Set(recommendedTopics.map((t) => (t.name || '').toLowerCase()));
        recommendedTopics = [
          ...recommendedTopics,
          ...more.filter((t) => !existingNames.has((t.name || '').toLowerCase())),
        ].slice(0, 6);
        console.log('[ENSURE_RECS] After merging topic recommendations, total:', recommendedTopics.length);
      }
    } catch (err) {
      console.error('[ENSURE_RECS] Topic recommendations failed, falling back to interests', err);
    }
  }

  // Tertiary: Interest-based fallback
  if (recommendedTopics.length < 6) {
    console.log('[ENSURE_RECS] Still need more, using interest-based fallback');
    const interestTopics = normalizeTopics(
      fallbackTopicsFromInterests(onboarding, forceConfidence),
      {
        forceConfidence,
        progress: 0,
        padToSix: false,
      },
    );
    console.log('[ENSURE_RECS] Got interest topics:', interestTopics.length);
    const existingNames = new Set(recommendedTopics.map((t) => (t.name || '').toLowerCase()));
    recommendedTopics = [
      ...recommendedTopics,
      ...interestTopics.filter((t) => !existingNames.has((t.name || '').toLowerCase())),
    ].slice(0, 6);
    console.log('[ENSURE_RECS] After interest fallback, total:', recommendedTopics.length);
  }

  // Final safety net
  if (recommendedTopics.length < 6) {
    console.log('[ENSURE_RECS] Using final safety net');
    recommendedTopics = normalizeTopics(
      [
        { name: 'Learning Skills', category: 'General', confidence: forceConfidence || 'Suggested', description: 'Develop effective learning strategies and techniques to accelerate your educational journey.' },
        { name: 'Study Habits', category: 'General', confidence: forceConfidence || 'Suggested', description: 'Build consistent and productive study routines that maximize retention and understanding.' },
        { name: 'Problem Solving', category: 'General', confidence: forceConfidence || 'Suggested', description: 'Master systematic approaches to analyzing and solving complex problems across domains.' },
        { name: 'Critical Thinking', category: 'General', confidence: forceConfidence || 'Suggested', description: 'Enhance your ability to evaluate information, analyze arguments, and make sound decisions.' },
        { name: 'Communication', category: 'General', confidence: forceConfidence || 'Suggested', description: 'Improve your written and verbal communication skills for professional and academic success.' },
        { name: 'Project Execution', category: 'General', confidence: forceConfidence || 'Suggested', description: 'Learn to plan, organize, and deliver projects effectively from conception to completion.' },
      ],
      { forceConfidence, progress: 0, padToSix: false },
    );
    console.log('[ENSURE_RECS] Safety net applied, total:', recommendedTopics.length);
  }

  // If still short, pad to 6 with placeholders
  if (recommendedTopics.length < 6) {
    console.log('[ENSURE_RECS] Padding to 6 with placeholders');
    recommendedTopics = normalizeTopics(recommendedTopics, { forceConfidence, progress: 0 });
  }

  console.log('[ENSURE_RECS] Final recommended topics count:', recommendedTopics.length);
  console.log('[ENSURE_RECS] Updating database...');
  
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
    console.error('[ENSURE_RECS] Database update error:', error);
    throw error;
  }

  console.log('[ENSURE_RECS] Returning updated state');
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

  // Fetch all paths for this user
  const { data: paths, error: pathsError } = await supabase
    .from('learning_paths')
    .select('id, status, completed_at')
    .eq('user_id', userId);

  if (pathsError) {
    console.error('Error fetching paths for stats:', pathsError);
  }

  // Fetch conversations count
  const { count: conversationCount, error: conversationError } = await supabase
    .from('assistant_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (conversationError) {
    console.error('Error fetching conversations for stats:', conversationError);
  }

  const allLabs = labs || [];
  const allPaths = paths || [];
  const totalChats = conversationCount || 0;

  if (allLabs.length === 0 && allPaths.length === 0 && totalChats === 0) {
    return {};
  }

  // Calculate statistics
  const completedLabs = allLabs.filter(l => l.status === 'completed');
  const inProgressLabs = allLabs.filter(l => l.status === 'in-progress');
  
  const completedPaths = allPaths.filter(p => p.status === 'completed');
  const inProgressPaths = allPaths.filter(p => p.status === 'in-progress');
  
  // Calculate success rate: show success rate of labs you've actually engaged with
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

  // Process completed paths for monthly activity
  completedPaths.forEach(path => {
    if (path.completed_at) {
      const monthKey = path.completed_at.slice(0, 7);
      if (!monthlyActivity[monthKey]) {
        monthlyActivity[monthKey] = { labs: 0, paths: 0 };
      }
      monthlyActivity[monthKey].paths += 1;
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
    path_completed: completedPaths.length,
    path_started: inProgressPaths.length,
    chat_active: totalChats
  };

  return {
    total_courses: completedLabs.length + completedPaths.length,
    total_activities: allLabs.length + allPaths.length + totalChats,
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
      // We map these to the breakdown we want in the UI
      in_progress: inProgressLabs.length,
      completed: completedLabs.length,
      // New specific fields
      labs_completed: completedLabs.length,
      labs_in_progress: inProgressLabs.length,
      paths_completed: completedPaths.length,
      paths_in_progress: inProgressPaths.length
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
    
    // Fetch user's learning paths with item counts
    const { data: learningPaths } = await supabase
      .from('learning_paths')
      .select(`
        id,
        title,
        status,
        learning_path_items (
          id,
          status
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Calculate progress for each path
    const learningPathData = (learningPaths || []).map((path: any) => {
      const items = path.learning_path_items || [];
      const total = items.length;
      const completed = items.filter((item: any) => item.status === 'completed').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        id: path.id,
        title: path.title,
        progress,
        completed,
        total,
        status: path.status,
      };
    });
    
    console.log('[DASHBOARD_GET] Calling ensureRecommendations with forceRefresh=false');
    const withRecs = await ensureRecommendations(state);
    res.json({ ...withRecs, activities, learning_path: learningPathData });
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
  console.log('[REGENERATE] Starting recommendation regeneration for user:', userId);
  
  if (!userId) {
    console.log('[REGENERATE] No user ID found, returning 401');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseAdmin();
    console.log('[REGENERATE] Got Supabase admin client');

    // clear current recommendations to force regeneration
    console.log('[REGENERATE] Clearing current recommendations...');
    const { error: clearError } = await supabase
      .from('dashboard_state')
      .update({ recommended_topics: [] })
      .eq('user_id', userId);
    
    if (clearError) {
      console.error('[REGENERATE] Error clearing recommendations:', clearError);
    } else {
      console.log('[REGENERATE] Successfully cleared recommendations');
    }

    console.log('[REGENERATE] Getting or creating state...');
    const state = await getOrCreateState(userId);
    console.log('[REGENERATE] Got state, now ensuring recommendations with forceRefresh=true');
    
    const refreshed = await ensureRecommendations({ ...state, recommended_topics: [] }, { forceRefresh: true });
    console.log('[REGENERATE] Recommendations refreshed, returning response');

    res.json(refreshed);
  } catch (error: any) {
    console.error('[REGENERATE] Dashboard regenerate error:', error);
    console.error('[REGENERATE] Error stack:', error?.stack);
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
