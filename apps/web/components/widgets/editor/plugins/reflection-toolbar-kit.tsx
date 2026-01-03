'use client';

import { createPlatePlugin } from 'platejs/react';

import { FixedToolbar } from '@/components/ui/fixed-toolbar';
import { ReflectionToolbarButtons } from '@/components/ui/reflection-toolbar-buttons';

export const ReflectionToolbarKit = [
  createPlatePlugin({
    key: 'reflection-toolbar',
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <ReflectionToolbarButtons />
        </FixedToolbar>
      ),
    },
  }),
];
