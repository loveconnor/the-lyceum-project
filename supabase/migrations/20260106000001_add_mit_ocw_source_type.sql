-- Add MIT OpenCourseWare source type to the registry
-- This migration adds 'mit_ocw' to the allowed source types

-- Drop the existing constraint
ALTER TABLE public.source_registry_sources 
DROP CONSTRAINT IF EXISTS source_registry_sources_type_check;

-- Add the new constraint with 'mit_ocw' included
ALTER TABLE public.source_registry_sources 
ADD CONSTRAINT source_registry_sources_type_check 
CHECK (type IN ('openstax', 'mit_ocw', 'sphinx_docs', 'generic_html', 'custom'));
