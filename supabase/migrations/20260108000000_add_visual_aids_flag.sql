-- Migration: Add uses_visual_aids flag to learning_path_items
-- This flag indicates whether a module would benefit from illustrative visual aids
-- Visual aids are supplemental only - registry content remains authoritative

ALTER TABLE learning_path_items
ADD COLUMN IF NOT EXISTS uses_visual_aids BOOLEAN DEFAULT FALSE;

-- Add comment to document the purpose
COMMENT ON COLUMN learning_path_items.uses_visual_aids IS 
  'Flag indicating if this module would benefit from illustrative visual aids. Visual aids are NON-AUTHORITATIVE supplements - registry content is the source of truth.';
