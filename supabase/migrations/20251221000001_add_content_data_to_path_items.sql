-- Add content_data column to learning_path_items for storing generated module content
ALTER TABLE public.learning_path_items 
ADD COLUMN IF NOT EXISTS content_data jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.learning_path_items.content_data IS 'Stores AI-generated module content including learning objectives, concepts, exercises, and assessments';

-- Add index for querying items with content
CREATE INDEX IF NOT EXISTS learning_path_items_content_data_idx ON public.learning_path_items USING gin (content_data) WHERE content_data IS NOT NULL;
