'use client';

import * as React from 'react';
import { normalizeNodeId, type Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';
import { cn } from '@/lib/utils';
import { EditorKit } from '@/components/widgets/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Card, CardContent } from '@/components/ui/card';

/**
 * EditorWidget Interface
 * 
 * A reusable rich-text editor widget that can be embedded in various contexts
 * such as examples, exercises, reflections, or AI chat outputs.
 */
export interface EditorWidgetProps {
  /** Initial content for the editor in Plate's Value format */
  initialValue?: Value;
  
  /** Callback fired when content changes */
  onChange?: (value: Value) => void;
  
  /** Whether the editor is read-only */
  readOnly?: boolean;
  
  /** Placeholder text when editor is empty */
  placeholder?: string;
  
  /** Visual variant for the editor */
  variant?: 'default' | 'demo' | 'fullWidth' | 'ai' | 'aiChat' | 'comment';
  
  /** Height of the editor container */
  height?: string;
  
  /** Optional label above the editor */
  label?: string;
  
  /** Optional description below the label */
  description?: string;
  
  /** Whether to wrap in a card component */
  showCard?: boolean;
  
  /** Additional className for the container */
  className?: string;
  
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
}

const defaultValue: Value = normalizeNodeId([
  {
    children: [{ text: '' }],
    type: 'p',
  },
]);

/**
 * EditorWidget Component
 * 
 * A self-contained, reusable rich-text editor that preserves all formatting
 * capabilities, toolbar functionality, and visual design of the original editor
 * while providing a clean interface for embedding in different contexts.
 */
export function EditorWidget({
  initialValue = defaultValue,
  onChange,
  readOnly = false,
  placeholder = 'Start typing...',
  variant = 'default',
  height,
  label,
  description,
  showCard = false,
  className,
  autoFocus = false,
}: EditorWidgetProps) {
  const editor = usePlateEditor({
    plugins: EditorKit,
    value: initialValue,
    override: {
      components: {
        ...(readOnly && {
          // Disable interactive features in read-only mode
        }),
      },
    },
  });

  // Handle content changes
  const handleChange = React.useCallback(() => {
    if (onChange && editor) {
      onChange(editor.children as Value);
    }
  }, [editor, onChange]);

  // Auto-focus if requested
  React.useEffect(() => {
    if (autoFocus && editor && !readOnly) {
      setTimeout(() => {
        editor.tf.focus();
      }, 0);
    }
  }, [autoFocus, editor, readOnly]);

  const editorContent = (
    <div
      className={cn(
        'flex flex-col',
        height && 'overflow-hidden',
        className
      )}
      style={height ? { height } : undefined}
    >
      {(label || description) && (
        <div className="space-y-1 mb-3">
          {label && (
            <label className="text-sm font-medium text-foreground">
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-muted-foreground italic">
              {description}
            </p>
          )}
        </div>
      )}
      
      <Plate editor={editor} onChange={handleChange}>
        <EditorContainer
          variant={variant === 'demo' ? 'demo' : 'default'}
          className={cn(
            height && 'h-full overflow-y-auto',
            readOnly && 'cursor-default'
          )}
        >
          <Editor
            variant={variant}
            placeholder={placeholder}
            readOnly={readOnly}
            className={cn(
              readOnly && 'opacity-100',
              height && 'h-full'
            )}
          />
        </EditorContainer>
      </Plate>
    </div>
  );

  if (showCard) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          {editorContent}
        </CardContent>
      </Card>
    );
  }

  return editorContent;
}

/**
 * EditorWidget with preset for read-only display
 */
export function EditorWidgetReadOnly(props: Omit<EditorWidgetProps, 'readOnly'>) {
  return <EditorWidget {...props} readOnly={true} />;
}

/**
 * EditorWidget with preset for exercises/examples
 */
export function EditorWidgetExample(props: EditorWidgetProps) {
  return (
    <EditorWidget
      {...props}
      variant={props.variant || 'default'}
      showCard={props.showCard ?? true}
    />
  );
}

/**
 * EditorWidget with preset for AI chat contexts
 */
export function EditorWidgetAIChat(props: EditorWidgetProps) {
  return (
    <EditorWidget
      {...props}
      variant="aiChat"
      showCard={props.showCard ?? false}
    />
  );
}

/**
 * Helper function to create editor content from markdown or plain text
 */
export function createEditorValue(text: string): Value {
  return normalizeNodeId([
    {
      children: [{ text }],
      type: 'p',
    },
  ]);
}

/**
 * Helper function to extract plain text from editor value
 */
export function extractPlainText(value: Value): string {
  const getText = (node: any): string => {
    if (node.text !== undefined) {
      return node.text;
    }
    if (node.children) {
      return node.children.map(getText).join('');
    }
    return '';
  };
  
  return value.map(getText).join('\n');
}
