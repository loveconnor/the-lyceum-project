import { Router } from 'express';
import { getSupabaseAdmin } from '../supabaseAdmin';
import { requireAuth } from '../auth';

const router: Router = Router();

const getUserId = (req: any): string | undefined => req.user?.id;

// Get all notifications for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ notifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
});

// Get unread notification count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ notification: data });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark all notifications as read' });
  }
});

// Delete a notification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: error.message || 'Failed to delete notification' });
  }
});

// Create a notification (typically called by system/background jobs)
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, title, message, metadata } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields: type, title, message' });
    }

    const validTypes = ['learning_reminder', 'path_completion', 'lab_completion', 'module_completion', 'streak_milestone'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ notification: data });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: error.message || 'Failed to create notification' });
  }
});

export default router;
