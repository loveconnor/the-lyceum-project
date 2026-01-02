'use client';

import { type Value, TrailingBlockPlugin } from 'platejs';
import { type TPlateEditor, useEditorRef } from 'platejs/react';

import { AlignKit } from '@/components/widgets/editor/plugins/align-kit';
import { AutoformatKit } from '@/components/widgets/editor/plugins/autoformat-kit';
import { BasicBlocksKit } from '@/components/widgets/editor/plugins/basic-blocks-kit';
import { BasicMarksKit } from '@/components/widgets/editor/plugins/basic-marks-kit';
import { BlockMenuKit } from '@/components/widgets/editor/plugins/block-menu-kit';
import { BlockPlaceholderKit } from '@/components/widgets/editor/plugins/block-placeholder-kit';
import { CalloutKit } from '@/components/widgets/editor/plugins/callout-kit';
import { CodeBlockKit } from '@/components/widgets/editor/plugins/code-block-kit';
import { ColumnKit } from '@/components/widgets/editor/plugins/column-kit';
import { CommentKit } from '@/components/widgets/editor/plugins/comment-kit';
import { CursorOverlayKit } from '@/components/widgets/editor/plugins/cursor-overlay-kit';
import { DateKit } from '@/components/widgets/editor/plugins/date-kit';
import { DiscussionKit } from '@/components/widgets/editor/plugins/discussion-kit';
import { DndKit } from '@/components/widgets/editor/plugins/dnd-kit';
import { DocxKit } from '@/components/widgets/editor/plugins/docx-kit';
import { EmojiKit } from '@/components/widgets/editor/plugins/emoji-kit';
import { ExitBreakKit } from '@/components/widgets/editor/plugins/exit-break-kit';
import { FixedToolbarKit } from '@/components/widgets/editor/plugins/fixed-toolbar-kit';
import { FloatingToolbarKit } from '@/components/widgets/editor/plugins/floating-toolbar-kit';
import { FontKit } from '@/components/widgets/editor/plugins/font-kit';
import { LineHeightKit } from '@/components/widgets/editor/plugins/line-height-kit';
import { LinkKit } from '@/components/widgets/editor/plugins/link-kit';
import { ListKit } from '@/components/widgets/editor/plugins/list-kit';
import { MarkdownKit } from '@/components/widgets/editor/plugins/markdown-kit';
import { MathKit } from '@/components/widgets/editor/plugins/math-kit';
import { MediaKit } from '@/components/widgets/editor/plugins/media-kit';
import { MentionKit } from '@/components/widgets/editor/plugins/mention-kit';
import { SlashKit } from '@/components/widgets/editor/plugins/slash-kit';
import { SuggestionKit } from '@/components/widgets/editor/plugins/suggestion-kit';
import { TableKit } from '@/components/widgets/editor/plugins/table-kit';
import { TocKit } from '@/components/widgets/editor/plugins/toc-kit';
import { ToggleKit } from '@/components/widgets/editor/plugins/toggle-kit';

export const EditorKit = [
  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Collaboration
  ...DiscussionKit,
  ...CommentKit,
  ...SuggestionKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...DocxKit,
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
