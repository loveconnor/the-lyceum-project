// Types for the minimal notification system focused on learning

export type NotificationType = 
  | 'learning_reminder' 
  | 'path_completion' 
  | 'lab_completion' 
  | 'module_completion' 
  | 'streak_milestone';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: {
    path_id?: string;
    path_title?: string;
    lab_id?: string;
    lab_title?: string;
    module_id?: string;
    module_title?: string;
    days_since_activity?: number;
    streak_count?: number;
    [key: string]: unknown;
  };
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPreferences {
  learning_reminders: boolean;
  path_milestones: boolean;
  lab_milestones: boolean;
  email_enabled: boolean;
}

// Helper function to generate notification messages
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'learning_reminder':
      return '⏰';
    case 'path_completion':
      return '🎉';
    case 'lab_completion':
      return '✅';
    case 'module_completion':
      return '📚';
    case 'streak_milestone':
      return '🔥';
    default:
      return '📬';
  }
}

export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case 'learning_reminder':
      return 'text-blue-600 dark:text-blue-400';
    case 'path_completion':
      return 'text-green-600 dark:text-green-400';
    case 'lab_completion':
      return 'text-green-600 dark:text-green-400';
    case 'module_completion':
      return 'text-purple-600 dark:text-purple-400';
    case 'streak_milestone':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

// Generate sample learning notifications for development
export function generateSampleNotifications(userId: string): Notification[] {
  const now = new Date();
  
  return [
    {
      id: '1',
      user_id: userId,
      type: 'learning_reminder',
      title: 'Continue Your Learning Path',
      message: "You haven't continued Introduction to Integrals in 3 days.",
      metadata: {
        path_id: 'path-1',
        path_title: 'Introduction to Integrals',
        days_since_activity: 3
      },
      is_read: false,
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      read_at: null
    },
    {
      id: '2',
      user_id: userId,
      type: 'learning_reminder',
      title: 'Almost There!',
      message: "You're one lab away from completing this learning path.",
      metadata: {
        path_id: 'path-2',
        path_title: 'Web Development Fundamentals',
        remaining_items: 1
      },
      is_read: false,
      created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      read_at: null
    },
    {
      id: '3',
      user_id: userId,
      type: 'module_completion',
      title: 'Module Completed!',
      message: 'You completed "Advanced React Patterns" module.',
      metadata: {
        module_id: 'module-1',
        module_title: 'Advanced React Patterns',
        path_id: 'path-3'
      },
      is_read: true,
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      read_at: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      user_id: userId,
      type: 'path_completion',
      title: 'Learning Path Completed! 🎉',
      message: 'Congratulations on completing "JavaScript Fundamentals"!',
      metadata: {
        path_id: 'path-4',
        path_title: 'JavaScript Fundamentals'
      },
      is_read: true,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}
