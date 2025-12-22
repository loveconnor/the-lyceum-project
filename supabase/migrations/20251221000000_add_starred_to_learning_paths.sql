-- Add starred field to learning_paths table
ALTER TABLE public.learning_paths 
ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;

-- Create index for filtering starred paths
CREATE INDEX IF NOT EXISTS learning_paths_starred_idx ON public.learning_paths (user_id, starred) WHERE starred = true;
