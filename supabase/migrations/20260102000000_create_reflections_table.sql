-- Create reflections table to store structured post-activity reflections
-- Reflections help learners convert action into understanding

CREATE TABLE IF NOT EXISTS public.reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Context: What triggered this reflection
  context_type text NOT NULL CHECK (context_type IN ('lab', 'exercise', 'module', 'path_item')),
  context_id uuid NOT NULL,
  context_title text NOT NULL,
  
  -- Structured reflection content (stored as Plate editor Value format)
  what_i_tried jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_worked_or_failed jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_i_would_do_differently jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  confidence_level integer CHECK (confidence_level >= 1 AND confidence_level <= 5),
  time_spent_minutes integer,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one reflection per context per user
  UNIQUE(user_id, context_type, context_id)
);

-- Add indexes for efficient queries
CREATE INDEX reflections_user_id_idx ON public.reflections(user_id);
CREATE INDEX reflections_context_idx ON public.reflections(context_type, context_id);
CREATE INDEX reflections_created_at_idx ON public.reflections(created_at DESC);

-- Enable RLS
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reflections"
ON public.reflections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reflections"
ON public.reflections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
ON public.reflections
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
ON public.reflections
FOR DELETE
USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_reflections_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trg_update_reflections_updated_at
BEFORE UPDATE ON public.reflections
FOR EACH ROW
EXECUTE FUNCTION public.update_reflections_updated_at();

-- Add comment to explain the table
COMMENT ON TABLE public.reflections IS 'Stores structured post-activity reflections that help learners consolidate understanding. Each reflection captures what was tried, what worked/failed, and what would be done differently next time.';
