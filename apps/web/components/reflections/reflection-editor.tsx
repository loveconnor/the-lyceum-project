'use client';

import * as React from 'react';
import { normalizeNodeId, type Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';
import { cn } from '@/lib/utils';
import { ReflectionEditorKit } from '@/components/widgets/editor/reflection-editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { REFLECTION_PROMPTS } from '@/types/reflections';

/**
 * ReflectionSection Component
 * 
 * A focused editor section for one part of a structured reflection.
 * Uses minimal UI to keep focus on the thinking and writing.
 */
interface ReflectionSectionProps {
  sectionKey: keyof typeof REFLECTION_PROMPTS;
  value: Value;
  onChange: (value: Value) => void;
  autoFocus?: boolean;
}

const defaultValue: Value = normalizeNodeId([
  {
    children: [{ text: '' }],
    type: 'p',
  },
]);

export function ReflectionSection({
  sectionKey,
  value,
  onChange,
  autoFocus = false,
}: ReflectionSectionProps) {
  const section = REFLECTION_PROMPTS[sectionKey];
  
  const editor = usePlateEditor({
    plugins: ReflectionEditorKit,
    value: value && value.length > 0 ? value : defaultValue,
  });

  // Handle content changes
  const handleChange = React.useCallback(({ value }: { value: Value }) => {
    onChange(value);
  }, [onChange]);

  // Auto-focus if requested
  React.useEffect(() => {
    if (autoFocus && editor) {
      setTimeout(() => {
        editor.tf.focus();
      }, 100);
    }
  }, [autoFocus, editor]);

  return (
    <div className="space-y-2">
      {/* Section Title */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          {section.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {section.prompt}
        </p>
      </div>

      {/* Editor */}
      <Plate editor={editor} onChange={handleChange}>
        <EditorContainer
          className={cn(
            "min-h-[120px] rounded-md border border-input bg-background",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            "transition-shadow duration-200"
          )}
        >
          <Editor
            variant="none"
            className="w-full px-3 py-2 text-sm"
          />
        </EditorContainer>
      </Plate>
    </div>
  );
}

/**
 * ReflectionEditor Component
 * 
 * The main component for creating or editing a reflection.
 * Provides three structured sections with minimal, professional UI.
 */
interface ReflectionEditorProps {
  initialValues?: {
    what_i_tried?: Value;
    what_worked_or_failed?: Value;
    what_i_would_do_differently?: Value;
  };
  onChange?: (values: {
    what_i_tried: Value;
    what_worked_or_failed: Value;
    what_i_would_do_differently: Value;
  }) => void;
  className?: string;
}

export function ReflectionEditor({
  initialValues,
  onChange,
  className,
}: ReflectionEditorProps) {
  const [values, setValues] = React.useState({
    what_i_tried: initialValues?.what_i_tried || defaultValue,
    what_worked_or_failed: initialValues?.what_worked_or_failed || defaultValue,
    what_i_would_do_differently: initialValues?.what_i_would_do_differently || defaultValue,
  });

  const handleSectionChange = React.useCallback(
    (sectionKey: keyof typeof values, value: Value) => {
      const newValues = {
        ...values,
        [sectionKey]: value,
      };
      setValues(newValues);
      onChange?.(newValues);
    },
    [values, onChange]
  );

  return (
    <div className={cn("space-y-8", className)}>
      <ReflectionSection
        sectionKey="what_i_tried"
        value={values.what_i_tried}
        onChange={(value) => handleSectionChange('what_i_tried', value)}
        autoFocus
      />

      <ReflectionSection
        sectionKey="what_worked_or_failed"
        value={values.what_worked_or_failed}
        onChange={(value) => handleSectionChange('what_worked_or_failed', value)}
      />

      <ReflectionSection
        sectionKey="what_i_would_do_differently"
        value={values.what_i_would_do_differently}
        onChange={(value) => handleSectionChange('what_i_would_do_differently', value)}
      />
    </div>
  );
}
