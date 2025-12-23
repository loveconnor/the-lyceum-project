-- Create notifications table for learning reminders and milestone notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('learning_reminder', 'path_completion', 'lab_completion', 'module_completion', 'streak_milestone')),
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_is_read_idx ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications(type);

-- Add RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Only authenticated users can insert notifications (for system-generated)
-- Note: In production, you might want to use a service role for automated notifications
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update read_at timestamp
CREATE OR REPLACE FUNCTION public.update_notification_read_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update read_at when notification is marked as read
DROP TRIGGER IF EXISTS trg_update_notification_read_at ON public.notifications;
CREATE TRIGGER trg_update_notification_read_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read)
EXECUTE FUNCTION public.update_notification_read_at();

-- Create notification preferences in user_settings if not exists
-- This assumes you have a user_settings table from previous migrations
-- If not, you can store notification preferences in profiles table or create a new table

-- Add comments for documentation
COMMENT ON TABLE public.notifications IS 'Stores user notifications for learning reminders and milestone achievements';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: learning_reminder, path_completion, lab_completion, module_completion, or streak_milestone';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional context like path_id, lab_id, module_id, days_since_activity, etc.';
