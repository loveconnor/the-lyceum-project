"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_1 = require("../ai");
const supabaseAdmin_1 = require("../supabaseAdmin");
const defaultState = (userId) => ({
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
const normalizeTopics = (topics = [], { forceConfidence, progress, padToSix = true, } = {}) => {
    const normalized = topics.slice(0, 6).map((t) => ({
        name: t.name || t.title || 'Topic',
        category: t.category ||
            t.difficulty ||
            t.suggested_formats?.[0] ||
            'General',
        confidence: forceConfidence ||
            t.confidence ||
            (typeof t.estimated_hours === 'number'
                ? `~${t.estimated_hours} hrs`
                : t.rationale || 'Suggested'),
        progress: typeof progress === 'number' ? progress : t.progress ?? 0,
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
const computeMostActiveMonth = (monthlyActivity) => {
    const entries = Object.entries(monthlyActivity || {});
    if (!entries.length)
        return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
};
const getOnboardingData = async (userId) => {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
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
const fallbackTopicsFromInterests = (onboarding, forceConfidence) => {
    const interests = Array.isArray(onboarding?.interests) ? onboarding.interests : [];
    if (!interests.length) {
        return [];
    }
    const uniqueInterests = [...new Set(interests)].filter(Boolean);
    const expanded = uniqueInterests.flatMap((interest) => [
        { name: interest, category: 'Interest', confidence: forceConfidence || 'Based on interests' },
        {
            name: `${interest} fundamentals`,
            category: 'Interest',
            confidence: forceConfidence || 'Based on interests',
        },
    ]);
    return expanded.slice(0, 6);
};
const isFallbackRecommendations = (topics = []) => {
    if (!topics.length)
        return true;
    const placeholders = topics.some((t) => (t.name || '').toLowerCase().startsWith('topic '));
    const basedOnInterests = topics.every((t) => (t.confidence || '').toLowerCase().includes('based on interests'));
    return placeholders || basedOnInterests;
};
const getOrCreateState = async (userId) => {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    const { data: existing, error } = await supabase
        .from('dashboard_state')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) {
        throw error;
    }
    if (existing)
        return existing;
    const initial = defaultState(userId);
    const { data: inserted, error: insertError } = await supabase
        .from('dashboard_state')
        .insert(initial)
        .select()
        .single();
    if (insertError) {
        throw insertError;
    }
    return inserted;
};
const ensureRecommendations = async (state, { forceRefresh = false } = {}) => {
    if (state.recommended_topics && state.recommended_topics.length && !forceRefresh) {
        if (!isFallbackRecommendations(state.recommended_topics)) {
            return state;
        }
    }
    const onboarding = await getOnboardingData(state.user_id);
    const forceConfidence = state.total_courses === 0 ? 'Complete an activity' : undefined;
    // Primary: AI course recommendations
    let recommendedTopics = [];
    try {
        const recs = await (0, ai_1.generateOnboardingRecommendations)(onboarding || {});
        if (recs?.recommendations?.length) {
            recommendedTopics = normalizeTopics(recs.recommendations, {
                forceConfidence,
                progress: 0,
                padToSix: false,
            });
        }
    }
    catch (err) {
        console.error('Onboarding recommendations failed, falling back to topics', err);
    }
    // Secondary: Topic recommendations
    if (recommendedTopics.length < 6) {
        try {
            const topics = await (0, ai_1.generateTopicRecommendations)(onboarding || {});
            if (topics?.length) {
                const more = normalizeTopics(topics, { forceConfidence, progress: 0, padToSix: false });
                const existingNames = new Set(recommendedTopics.map((t) => (t.name || '').toLowerCase()));
                recommendedTopics = [
                    ...recommendedTopics,
                    ...more.filter((t) => !existingNames.has((t.name || '').toLowerCase())),
                ].slice(0, 6);
            }
        }
        catch (err) {
            console.error('Topic recommendations failed, falling back to interests', err);
        }
    }
    // Tertiary: Interest-based fallback
    if (recommendedTopics.length < 6) {
        const interestTopics = normalizeTopics(fallbackTopicsFromInterests(onboarding, forceConfidence), {
            forceConfidence,
            progress: 0,
            padToSix: false,
        });
        const existingNames = new Set(recommendedTopics.map((t) => (t.name || '').toLowerCase()));
        recommendedTopics = [
            ...recommendedTopics,
            ...interestTopics.filter((t) => !existingNames.has((t.name || '').toLowerCase())),
        ].slice(0, 6);
    }
    // Final safety net
    if (recommendedTopics.length < 6) {
        recommendedTopics = normalizeTopics([
            { name: 'Learning Skills', category: 'General', confidence: forceConfidence || 'Suggested' },
            { name: 'Study Habits', category: 'General', confidence: forceConfidence || 'Suggested' },
            { name: 'Problem Solving', category: 'General', confidence: forceConfidence || 'Suggested' },
            { name: 'Critical Thinking', category: 'General', confidence: forceConfidence || 'Suggested' },
            { name: 'Communication', category: 'General', confidence: forceConfidence || 'Suggested' },
            { name: 'Project Execution', category: 'General', confidence: forceConfidence || 'Suggested' },
        ], { forceConfidence, progress: 0, padToSix: false });
    }
    // If still short, pad to 6 with placeholders
    if (recommendedTopics.length < 6) {
        recommendedTopics = normalizeTopics(recommendedTopics, { forceConfidence, progress: 0 });
    }
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
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
    return updated;
};
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const state = await getOrCreateState(userId);
        const withRecs = await ensureRecommendations(state);
        res.json(withRecs);
    }
    catch (error) {
        console.error('Dashboard fetch error', error);
        res.status(500).json({ error: 'Failed to fetch dashboard state', details: error?.message });
    }
});
router.post('/activity', async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { activityType, minutes = 0, topic, successRate } = req.body || {};
    try {
        const state = await getOrCreateState(userId);
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const stats = state.stats || {};
        const activityCounts = stats.activity_counts || {};
        const monthlyActivity = stats.monthly_activity || {};
        const successSamples = stats.success_samples || 0;
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
        const top_topics = Array.isArray(state.top_topics)
            ? [...state.top_topics]
            : [];
        if (topic) {
            const existingIndex = top_topics.findIndex((t) => t.name === topic);
            if (existingIndex >= 0) {
                top_topics[existingIndex].count = (top_topics[existingIndex].count || 0) + 1;
            }
            else {
                top_topics.push({ name: topic, category: 'General', confidence: 'n/a', progress: 0, count: 1 });
            }
        }
        const sortedTopTopics = top_topics
            .map((t) => ({ ...t, count: t.count || 1 }))
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .slice(0, 6);
        const updatedPayload = {
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
    }
    catch (error) {
        console.error('Dashboard activity error', error);
        res.status(500).json({ error: 'Failed to record activity', details: error?.message });
    }
});
router.post('/recommendations/regenerate', async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        // clear current recommendations to force regeneration
        await supabase.from('dashboard_state').update({ recommended_topics: [] }).eq('user_id', userId);
        const state = await getOrCreateState(userId);
        const refreshed = await ensureRecommendations({ ...state, recommended_topics: [] }, { forceRefresh: true });
        res.json(refreshed);
    }
    catch (error) {
        console.error('Dashboard regenerate error', error);
        res.status(500).json({ error: 'Failed to regenerate recommendations', details: error?.message });
    }
});
exports.default = router;
