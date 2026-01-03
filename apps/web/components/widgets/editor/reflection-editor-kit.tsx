'use client';

import { type Value, TrailingBlockPlugin } from 'platejs';

import { AutoformatKit } from '@/components/widgets/editor/plugins/autoformat-kit';
import { BasicBlocksKit } from '@/components/widgets/editor/plugins/basic-blocks-kit';
import { BasicMarksKit } from '@/components/widgets/editor/plugins/basic-marks-kit';
import { BlockPlaceholderKit } from '@/components/widgets/editor/plugins/block-placeholder-kit';
import { ExitBreakKit } from '@/components/widgets/editor/plugins/exit-break-kit';
import { ReflectionToolbarKit } from '@/components/widgets/editor/plugins/reflection-toolbar-kit';
import { LinkKit } from '@/components/widgets/editor/plugins/link-kit';
import { ListKit } from '@/components/widgets/editor/plugins/list-kit';
import { MarkdownKit } from '@/components/widgets/editor/plugins/markdown-kit';

/**
 * Minimal editor kit for reflections
 * 
 * Includes only essential formatting:
 * - Basic marks (bold, italic, underline, strikethrough)
 * - Basic blocks (paragraph, headings, blockquote)
 * - Lists (bullet, numbered)
 * - Links
 * - Markdown shortcuts
 */
export const ReflectionEditorKit = [
  // Core blocks and marks
  ...BasicBlocksKit,
  ...BasicMarksKit,
  
  // Lists for structuring thoughts
  ...ListKit,
  
  // Links for references
  ...LinkKit,

  // Editing conveniences
  ...AutoformatKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...ReflectionToolbarKit,
];
