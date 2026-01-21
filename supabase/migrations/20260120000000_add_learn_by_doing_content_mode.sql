-- Add learn_by_doing as a valid content_mode for learning_path_items

DO $$ BEGIN
  ALTER TYPE content_mode ADD VALUE IF NOT EXISTS 'learn_by_doing';
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

ALTER TABLE public.learning_path_items
  DROP CONSTRAINT IF EXISTS learning_path_items_content_mode_check;

ALTER TABLE public.learning_path_items
  ADD CONSTRAINT learning_path_items_content_mode_check
  CHECK (content_mode IN ('ai_generated', 'registry_backed', 'learn_by_doing'));

COMMENT ON COLUMN public.learning_path_items.content_mode IS 'How content is generated: ai_generated (legacy), registry_backed (grounded in source registry), or learn_by_doing (interactive)';
