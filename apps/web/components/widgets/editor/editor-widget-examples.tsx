/**
 * EditorWidget Usage Examples
 * 
 * This file demonstrates various ways to use the EditorWidget component
 * in different contexts throughout the application.
 */

import React from 'react';
import { EditorWidget, EditorWidgetReadOnly, EditorWidgetExample, EditorWidgetAIChat, createEditorValue } from '@/components/widgets';
import type { EditorWidgetProps } from '@/components/widgets';
import { normalizeNodeId, type Value } from 'platejs';

// Example 1: Basic Editable Widget
// Use this for simple note-taking, reflections, or user input
export function BasicEditorExample() {
  const handleChange = (value: Value) => {
    console.log('Content changed:', value);
  };

  return (
    <EditorWidget
      placeholder="Write your reflection here..."
      onChange={handleChange}
      label="Personal Reflection"
      description="Share your thoughts about what you've learned"
    />
  );
}

// Example 2: Read-Only Widget for Displaying Content
// Use this to show examples, documentation, or completed work
export function ReadOnlyEditorExample() {
  const exampleContent: Value = normalizeNodeId([
    {
      children: [{ text: 'Example Solution' }],
      type: 'h2',
    },
    {
      children: [
        { text: 'Here is how you can approach this problem:' }
      ],
      type: 'p',
    },
    {
      children: [
        { text: 'Step 1: ' },
        { bold: true, text: 'Identify the key variables' },
      ],
      type: 'p',
    },
    {
      children: [
        { text: 'Step 2: Write the equations' }
      ],
      type: 'p',
    },
  ]);

  return (
    <EditorWidgetReadOnly
      initialValue={exampleContent}
      label="Solution Example"
    />
  );
}

// Example 3: Widget in Card Format
// Use this when you want the editor contained in a card UI
export function CardEditorExample() {
  return (
    <EditorWidget
      showCard={true}
      placeholder="Enter your answer..."
      label="Exercise Response"
      height="300px"
    />
  );
}

// Example 4: AI Chat Context
// Use this in AI chat interfaces for inline editing
export function AIChatEditorExample() {
  return (
    <EditorWidgetAIChat
      placeholder="Ask a follow-up question..."
      autoFocus={true}
    />
  );
}

// Example 5: Exercise with Initial Content
// Use this to provide starter content for an exercise
export function ExerciseEditorExample() {
  const starterContent: Value = normalizeNodeId([
    {
      children: [{ text: 'Complete the following proof:' }],
      type: 'p',
    },
    {
      children: [{ text: '' }],
      type: 'p',
    },
    {
      children: [
        { text: 'Given: ' },
        { italic: true, text: 'Add your assumptions here' },
      ],
      type: 'p',
    },
  ]);

  return (
    <EditorWidgetExample
      initialValue={starterContent}
      label="Proof Exercise"
      description="Complete the mathematical proof using the format provided"
      height="400px"
    />
  );
}

// Example 6: Multiple Editors in a Layout
// Use this when you need multiple editors, like comparing solutions
export function MultipleEditorsExample() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <EditorWidget
        placeholder="Your approach..."
        label="Your Solution"
        height="400px"
      />
      <EditorWidget
        placeholder="Alternative approach..."
        label="Alternative Solution"
        height="400px"
      />
    </div>
  );
}

// Example 7: Dynamic Content from Text
// Use this when converting plain text or markdown to editor content
export function DynamicContentExample() {
  const textContent = "This is a simple text that will be displayed in the editor";
  const editorValue = createEditorValue(textContent);

  return (
    <EditorWidgetReadOnly
      initialValue={editorValue}
      label="Generated Content"
    />
  );
}

// Example 8: Full-Width Editor for Long-Form Content
// Use this for essays, detailed reflections, or documentation
export function LongFormEditorExample() {
  return (
    <EditorWidget
      variant="fullWidth"
      placeholder="Begin writing your essay..."
      label="Essay Submission"
      description="Write a comprehensive response (minimum 500 words)"
      height="600px"
    />
  );
}

// Example 9: Custom Styling and Variants
// Use this to match specific UI contexts
export function CustomStyledEditorExample() {
  return (
    <EditorWidget
      variant="demo"
      className="rounded-lg border-2 border-primary/20"
      placeholder="Try out the editor features..."
    />
  );
}

// Example 10: Integration with State Management
// Use this pattern when integrating with React state or forms
export function StatefulEditorExample() {
  const [content, setContent] = React.useState<Value>(createEditorValue(''));
  const [wordCount, setWordCount] = React.useState(0);

  const handleContentChange = (value: Value) => {
    setContent(value);
    
    // Calculate word count
    const text = extractPlainText(value);
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  };

  return (
    <div className="space-y-2">
      <EditorWidget
        initialValue={content}
        onChange={handleContentChange}
        placeholder="Write your content..."
        label="Tracked Content"
        height="350px"
      />
      <div className="text-sm text-muted-foreground">
        Word count: {wordCount}
      </div>
    </div>
  );
}

// Helper function for extracting plain text (imported from widget)
function extractPlainText(value: Value): string {
  type EditorTextNode = {
    text?: string;
    children?: EditorTextNode[];
  };

  const getText = (node: EditorTextNode): string => {
    if (typeof node.text === "string") {
      return node.text;
    }
    if (Array.isArray(node.children)) {
      return node.children.map(getText).join('');
    }
    return '';
  };

  return (value as EditorTextNode[]).map(getText).join('\n');
}

/**
 * Common Use Cases:
 * 
 * 1. Learning Module Exercises
 *    - Use EditorWidget with onChange to capture student responses
 *    - Use EditorWidgetReadOnly to display example solutions
 * 
 * 2. AI Chat Outputs
 *    - Use EditorWidgetAIChat for inline editing of AI-generated content
 *    - Set readOnly={true} for displaying AI responses
 * 
 * 3. Lab Notebooks
 *    - Use EditorWidget with showCard for contained note-taking sections
 *    - Use variant="fullWidth" for main content areas
 * 
 * 4. Peer Review
 *    - Display original work with EditorWidgetReadOnly
 *    - Provide feedback area with EditorWidget
 * 
 * 5. Reflections & Journals
 *    - Use EditorWidget with auto-save on onChange
 *    - Track word counts or completion status
 */
