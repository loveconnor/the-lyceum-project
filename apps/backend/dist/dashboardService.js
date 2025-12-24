"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDashboardActivity = updateDashboardActivity;
exports.getLabsStatistics = getLabsStatistics;
exports.getPathsStatistics = getPathsStatistics;
const supabaseAdmin_1 = require("./supabaseAdmin");
const computeMostActiveMonth = (monthlyActivity) => {
    const entries = Object.entries(monthlyActivity || {});
    if (!entries.length)
        return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
};
/**
 * Updates dashboard state when a user completes activities
 */
async function updateDashboardActivity(userId, activityData) {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    // For lab deletion, recalculate everything from scratch
    if (activityData.activityType === 'lab_deleted') {
        // Get all remaining labs
        const { data: labs, error: labsError } = await supabase
            .from('labs')
            .select('id, status, topics, estimated_duration, completed_at, created_at')
            .eq('user_id', userId);
        if (labsError) {
            console.error('Error fetching labs after deletion:', labsError);
            throw labsError;
        }
        // Calculate fresh statistics
        const completedLabs = labs?.filter(l => l.status === 'completed') || [];
        const inProgressLabs = labs?.filter(l => l.status === 'in-progress') || [];
        const engagedLabs = completedLabs.length + inProgressLabs.length;
        const successRate = engagedLabs > 0 ? (completedLabs.length / engagedLabs) * 100 : 0;
        let totalMinutes = 0;
        const topicCounts = {};
        completedLabs.forEach(lab => {
            if (lab.estimated_duration) {
                totalMinutes += lab.estimated_duration;
            }
            if (lab.topics && Array.isArray(lab.topics)) {
                lab.topics.forEach(topic => {
                    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                });
            }
        });
        // Build top topics
        const top_topics = Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, count]) => ({
            name,
            category: 'Topic',
            confidence: 'From completed labs',
            progress: Math.min(100, count * 10),
            count,
        }));
        // Update dashboard state with recalculated values
        const { error: updateError } = await supabase
            .from('dashboard_state')
            .update({
            total_courses: completedLabs.length,
            total_minutes: totalMinutes,
            overall_success_rate: successRate,
            top_topics,
            stats: {
                in_progress: inProgressLabs.length,
                completed: completedLabs.length,
            },
        })
            .eq('user_id', userId);
        if (updateError) {
            console.error('Error updating dashboard after lab deletion:', updateError);
            throw updateError;
        }
        console.log(`Dashboard recalculated after lab deletion for user ${userId}`);
        return;
    }
    // Get or create dashboard state
    let { data: state, error: fetchError } = await supabase
        .from('dashboard_state')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (fetchError) {
        console.error('Error fetching dashboard state:', fetchError);
        throw fetchError;
    }
    if (!state) {
        // Create initial state
        const { data: newState, error: createError } = await supabase
            .from('dashboard_state')
            .insert({
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
        })
            .select()
            .single();
        if (createError) {
            console.error('Error creating dashboard state:', createError);
            throw createError;
        }
        state = newState;
    }
    const dashboardState = state;
    const stats = dashboardState.stats || {};
    const activityCounts = stats.activity_counts || {};
    const monthlyActivity = stats.monthly_activity || {};
    const successSamples = stats.success_samples || 0;
    // Update activity counts
    const activityKey = activityData.activityType || 'general';
    activityCounts[activityKey] = (activityCounts[activityKey] || 0) + 1;
    // Track monthly activity
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7); // YYYY-MM
    monthlyActivity[monthKey] = (monthlyActivity[monthKey] || 0) + 1;
    // Update success rate based on completion
    // For labs/paths: track as samples for weighted average
    let overall_success_rate = dashboardState.overall_success_rate;
    if (activityData.activityType === 'lab_completed' || activityData.activityType === 'path_completed') {
        // Add a successful completion (100%) to the average
        const newSuccessRate = typeof activityData.successRate === 'number' ? activityData.successRate : 100;
        overall_success_rate =
            (overall_success_rate * successSamples + newSuccessRate) / (successSamples + 1);
        stats.success_samples = successSamples + 1;
    }
    else if (typeof activityData.successRate === 'number') {
        // Custom success rate provided
        overall_success_rate =
            (overall_success_rate * successSamples + activityData.successRate) / (successSamples + 1);
        stats.success_samples = successSamples + 1;
    }
    // Update stats
    stats.activity_counts = activityCounts;
    stats.monthly_activity = monthlyActivity;
    // Update counts that frontend uses
    stats.in_progress = stats.in_progress || 0;
    stats.completed = stats.completed || 0;
    if (activityData.activityType === 'lab_started' || activityData.activityType === 'path_started') {
        stats.in_progress = (stats.in_progress || 0) + 1;
    }
    else if (activityData.activityType === 'lab_completed' || activityData.activityType === 'path_completed') {
        stats.completed = (stats.completed || 0) + 1;
        // When completing, decrement in_progress if it was started before
        if (stats.in_progress > 0) {
            stats.in_progress--;
        }
    }
    // Update top topics
    const top_topics = Array.isArray(dashboardState.top_topics)
        ? [...dashboardState.top_topics]
        : [];
    if (activityData.topics && activityData.topics.length > 0) {
        for (const topic of activityData.topics) {
            const existingIndex = top_topics.findIndex((t) => t.name === topic);
            if (existingIndex >= 0) {
                top_topics[existingIndex].count = (top_topics[existingIndex].count || 0) + 1;
                // Update progress for completed activities
                if (activityData.activityType.includes('completed')) {
                    top_topics[existingIndex].progress = Math.min(100, (top_topics[existingIndex].progress || 0) + 10);
                }
            }
            else {
                top_topics.push({
                    name: topic,
                    category: 'Topic',
                    confidence: 'From activity',
                    progress: activityData.activityType.includes('completed') ? 10 : 0,
                    count: 1,
                });
            }
        }
    }
    // Sort topics by count and limit to top 6
    const sortedTopTopics = top_topics
        .map((t) => ({ ...t, count: t.count || 1 }))
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 6);
    // Calculate total courses/activities
    const minuteValue = Number(activityData.minutes) || 0;
    const isCompletedActivity = activityData.activityType.includes('completed');
    // Update learning path data
    let learning_path = dashboardState.learning_path || [];
    if (activityData.activityType === 'path_completed' || activityData.activityType === 'path_started') {
        // Fetch current learning paths
        const { data: paths } = await supabase
            .from('learning_paths')
            .select('id, title, description, progress, status, topics')
            .eq('user_id', userId)
            .in('status', ['in-progress', 'not-started'])
            .order('created_at', { ascending: true })
            .limit(1);
        if (paths && paths.length > 0) {
            learning_path = paths;
        }
    }
    // Prepare update payload
    const updatedPayload = {
        total_activities: dashboardState.total_activities + 1,
        total_minutes: dashboardState.total_minutes + minuteValue,
        total_courses: dashboardState.total_courses + (isCompletedActivity ? 1 : 0),
        overall_success_rate,
        top_topics: sortedTopTopics,
        learning_path,
        stats,
        most_active_month: computeMostActiveMonth(monthlyActivity),
    };
    // Update dashboard state
    const { error: updateError } = await supabase
        .from('dashboard_state')
        .update(updatedPayload)
        .eq('user_id', userId);
    if (updateError) {
        console.error('Error updating dashboard state:', updateError);
        throw updateError;
    }
    console.log(`Dashboard updated for user ${userId}:`, {
        activityType: activityData.activityType,
        topics: activityData.topics,
        totalActivities: updatedPayload.total_activities,
    });
}
/**
 * Get aggregated statistics for labs
 */
async function getLabsStatistics(userId) {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    const { data: labs, error } = await supabase
        .from('labs')
        .select('id, status, topics, estimated_duration, completed_at, created_at')
        .eq('user_id', userId);
    if (error) {
        console.error('Error fetching labs statistics:', error);
        throw error;
    }
    const stats = {
        total: labs?.length || 0,
        completed: labs?.filter((l) => l.status === 'completed').length || 0,
        in_progress: labs?.filter((l) => l.status === 'in-progress').length || 0,
        not_started: labs?.filter((l) => l.status === 'not-started').length || 0,
        topics: {},
        totalMinutes: 0,
    };
    labs?.forEach((lab) => {
        if (lab.topics && Array.isArray(lab.topics)) {
            lab.topics.forEach((topic) => {
                stats.topics[topic] = (stats.topics[topic] || 0) + 1;
            });
        }
        if (lab.status === 'completed' && lab.estimated_duration) {
            stats.totalMinutes += lab.estimated_duration;
        }
    });
    return stats;
}
/**
 * Get aggregated statistics for learning paths
 */
async function getPathsStatistics(userId) {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    const { data: paths, error } = await supabase
        .from('learning_paths')
        .select('id, status, topics, estimated_duration, progress, completed_at, created_at')
        .eq('user_id', userId);
    if (error) {
        console.error('Error fetching paths statistics:', error);
        throw error;
    }
    const stats = {
        total: paths?.length || 0,
        completed: paths?.filter((p) => p.status === 'completed').length || 0,
        in_progress: paths?.filter((p) => p.status === 'in-progress').length || 0,
        not_started: paths?.filter((p) => p.status === 'not-started').length || 0,
        topics: {},
        totalMinutes: 0,
        averageProgress: 0,
    };
    let totalProgress = 0;
    paths?.forEach((path) => {
        if (path.topics && Array.isArray(path.topics)) {
            path.topics.forEach((topic) => {
                stats.topics[topic] = (stats.topics[topic] || 0) + 1;
            });
        }
        if (path.estimated_duration) {
            stats.totalMinutes += path.estimated_duration;
        }
        totalProgress += path.progress || 0;
    });
    if (paths && paths.length > 0) {
        stats.averageProgress = totalProgress / paths.length;
    }
    return stats;
}
