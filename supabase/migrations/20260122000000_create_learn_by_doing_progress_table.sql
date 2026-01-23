-- Create table to store learn-by-doing progress
-- Tracks completed steps so progress is preserved across sessions

CREATE TABLE IF NOT EXISTS public.learn_by_doing_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Context: Which module/path item this progress belongs to
  module_id uuid NOT NULL,
  
  -- Progress data
  completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of step indices that have been completed
  current_step integer NOT NULL DEFAULT 0,
  widget_states jsonb NOT NULL DEFAULT '{}'::jsonb, -- Store widget answers/selections by step index
  
  -- Generated tree for persistence (optional - can regenerate if needed)
  tree_data jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one progress record per user per module
  UNIQUE(user_id, module_id)
);

-- Add indexes for efficient queries
CREATE INDEX learn_by_doing_progress_user_id_idx ON public.learn_by_doing_progress(user_id);
CREATE INDEX learn_by_doing_progress_module_id_idx ON public.learn_by_doing_progress(module_id);
CREATE INDEX learn_by_doing_progress_updated_at_idx ON public.learn_by_doing_progress(updated_at DESC);

-- Enable RLS
ALTER TABLE public.learn_by_doing_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own learn-by-doing progress"
ON public.learn_by_doing_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learn-by-doing progress"
ON public.learn_by_doing_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learn-by-doing progress"
ON public.learn_by_doing_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learn-by-doing progress"
ON public.learn_by_doing_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_learn_by_doing_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_learn_by_doing_progress_updated_at
BEFORE UPDATE ON public.learn_by_doing_progress
FOR EACH ROW
EXECUTE FUNCTION update_learn_by_doing_progress_updated_at();
