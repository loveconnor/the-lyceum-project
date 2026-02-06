/**
 * Notification Generator Service
 * 
 * Helper functions to create learning reminders and milestone notifications.
 * This would typically be called by background jobs or event triggers.
 */

import { getSupabaseAdmin } from './supabaseAdmin';
import { NotificationType } from './types/notifications';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Get user's notification preferences
 */
async function getUserNotificationPreferences(userId: string) {
  const supabase = getSupabaseAdmin();
  
  // Settings are stored in auth.users.user_metadata.settings
  const { data: user, error } = await supabase.auth.admin.getUserById(userId);

  if (error || !user) {
    console.warn('Could not fetch user preferences, defaulting to all enabled:', error);
    // Default to all notifications enabled if we can't fetch preferences
    return {
      learning_reminders: true,
      path_milestones: true,
      lab_milestones: true,
      email_enabled: true
    };
  }

  const userMetadata = user.user?.user_metadata as any;
  const settings = userMetadata?.settings;
  
  return settings?.notifications || {
    learning_reminders: true,
    path_milestones: true,
    lab_milestones: true,
    email_enabled: true
  };
}

/**
 * Check if user has enabled notifications for a specific type
 */
async function shouldSendNotification(userId: string, type: NotificationType): Promise<boolean> {
  const prefs = await getUserNotificationPreferences(userId);

  switch (type) {
    case 'learning_reminder':
      return prefs.learning_reminders;
    case 'path_completion':
      return prefs.path_milestones;
    case 'lab_completion':
    case 'module_completion':
      return prefs.lab_milestones;
    case 'streak_milestone':
      return prefs.path_milestones; // Group with path milestones
    default:
      return false;
  }
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, metadata = {} } = params;

  try {
    // Check if user has this notification type enabled
    const shouldSend = await shouldSendNotification(userId, type);
    if (!shouldSend) {
      console.log(`Notification suppressed for user ${userId}, type: ${type} (disabled in preferences)`);
      return null;
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: If email notifications are enabled, send email here
    // await sendNotificationEmail(userId, data);

    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Generate a learning reminder for inactive users
 */
export async function createLearningReminder(
  userId: string,
  pathId: string,
  pathTitle: string,
  daysSinceActivity: number
) {
  return createNotification({
    userId,
    type: 'learning_reminder',
    title: 'Continue Your Learning Path',
    message: `You haven't continued ${pathTitle} in ${daysSinceActivity} days.`,
    metadata: {
      path_id: pathId,
      path_title: pathTitle,
      days_since_activity: daysSinceActivity
    }
  });
}

/**
 * Generate a notification for path completion
 */
export async function createPathCompletionNotification(
  userId: string,
  pathId: string,
  pathTitle: string
) {
  return createNotification({
    userId,
    type: 'path_completion',
    title: 'Learning Path Completed! 🎉',
    message: `Congratulations on completing "${pathTitle}"!`,
    metadata: {
      path_id: pathId,
      path_title: pathTitle
    }
  });
}

/**
 * Generate a notification for lab completion
 */
export async function createLabCompletionNotification(
  userId: string,
  labId: string,
  labTitle: string
) {
  return createNotification({
    userId,
    type: 'lab_completion',
    title: 'Lab Completed!',
    message: `You completed "${labTitle}"!`,
    metadata: {
      lab_id: labId,
      lab_title: labTitle
    }
  });
}

/**
 * Generate a notification for module completion
 */
export async function createModuleCompletionNotification(
  userId: string,
  moduleId: string,
  moduleTitle: string,
  pathId?: string
) {
  return createNotification({
    userId,
    type: 'module_completion',
    title: 'Module Completed!',
    message: `You completed "${moduleTitle}" module.`,
    metadata: {
      module_id: moduleId,
      module_title: moduleTitle,
      path_id: pathId
    }
  });
}

/**
 * Generate a reminder when user is close to completing a path
 */
export async function createAlmostDoneNotification(
  userId: string,
  pathId: string,
  pathTitle: string,
  remainingItems: number
) {
  return createNotification({
    userId,
    type: 'learning_reminder',
    title: 'Almost There!',
    message: `You're ${remainingItems === 1 ? 'one lab' : `${remainingItems} labs`} away from completing "${pathTitle}".`,
    metadata: {
      path_id: pathId,
      path_title: pathTitle,
      remaining_items: remainingItems
    }
  });
}

/**
 * Check and generate learning reminders for inactive users
 * This would typically run as a daily cron job
 */
export async function generateInactivityReminders() {
  try {
    const supabase = getSupabaseAdmin();
    // Get all users with in-progress learning paths
    const { data: inProgressPaths, error } = await supabase
      .from('learning_paths')
      .select('id, user_id, title, updated_at')
      .eq('status', 'in-progress');

    if (error) throw error;

    const now = new Date();
    
    for (const path of inProgressPaths || []) {
      const lastActivity = new Date(path.updated_at);
      const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminder after 3 days of inactivity
      if (daysSinceActivity >= 3) {
        // Check if we already sent a reminder in the last 2 days
        const { data: recentReminders } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', path.user_id)
          .eq('type', 'learning_reminder')
          .contains('metadata', { path_id: path.id })
          .gte('created_at', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!recentReminders || recentReminders.length === 0) {
          await createLearningReminder(
            path.user_id,
            path.id,
            path.title,
            daysSinceActivity
          );
        }
      }
    }
  } catch (error) {
    console.error('Error generating inactivity reminders:', error);
    throw error;
  }
}
