-- Add progress tracking columns to learning_path_items
-- This allows modules to store progress for reading, examples, and visuals

ALTER TABLE public.learning_path_items 
ADD COLUMN IF NOT EXISTS progress_data jsonb DEFAULT '{
  "reading_completed": false,
  "examples_completed": false,
  "visuals_completed": false,
  "completed_chapters": [],
  "viewed_concepts": [],
  "viewed_visuals": []
}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.learning_path_items.progress_data IS 'Stores user progress within the module: reading completion, examples viewed, visuals viewed, etc.';

-- Add index for querying items by progress
CREATE INDEX IF NOT EXISTS learning_path_items_progress_data_idx 
ON public.learning_path_items USING gin (progress_data);

-- Function to update item status based on progress_data
CREATE OR REPLACE FUNCTION public.update_item_status_from_progress()
RETURNS trigger AS $$
BEGIN
  -- If all three sections are complete, mark the item as completed
  IF (NEW.progress_data->>'reading_completed')::boolean = true 
     AND ((NEW.progress_data->>'examples_completed')::boolean = true 
          OR (NEW.progress_data->>'visuals_completed')::boolean = true) 
  THEN
    NEW.status := 'completed';
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  -- If at least one section has progress, mark as in-progress
  ELSIF (NEW.progress_data->>'reading_completed')::boolean = true 
        OR (NEW.progress_data->>'examples_completed')::boolean = true 
        OR (NEW.progress_data->>'visuals_completed')::boolean = true
  THEN
    IF NEW.status = 'not-started' THEN
      NEW.status := 'in-progress';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status when progress changes
DROP TRIGGER IF EXISTS trg_update_item_status_from_progress ON public.learning_path_items;
CREATE TRIGGER trg_update_item_status_from_progress
BEFORE UPDATE ON public.learning_path_items
FOR EACH ROW
WHEN (OLD.progress_data IS DISTINCT FROM NEW.progress_data)
EXECUTE FUNCTION public.update_item_status_from_progress();
