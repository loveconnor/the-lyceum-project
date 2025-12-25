-- Add 'module' as a valid item_type for learning_path_items
-- This allows paths to contain both modules (reading/content) and labs (hands-on practice)

-- Drop the existing check constraint
ALTER TABLE public.learning_path_items 
DROP CONSTRAINT IF EXISTS learning_path_items_item_type_check;

-- Add the new check constraint with 'module' included
ALTER TABLE public.learning_path_items 
ADD CONSTRAINT learning_path_items_item_type_check 
CHECK (item_type IN ('lab', 'module', 'reading', 'video', 'quiz', 'project'));

-- Add comment to explain the item types
COMMENT ON COLUMN public.learning_path_items.item_type IS 'Type of learning path item: module (AI-generated content with reading, examples, visuals), lab (hands-on practice), reading, video, quiz, or project';

-- Note: The 'module' type will use content_data for AI-generated content
-- The 'lab' type will use lab_id to reference the labs table
COMMENT ON COLUMN public.learning_path_items.content_data IS 'For module items: stores AI-generated content including learning objectives, concepts, exercises, and assessments. For other types: can store custom content data';
COMMENT ON COLUMN public.learning_path_items.lab_id IS 'For lab items: references the labs table. For other item types: null';
