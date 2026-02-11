'use client';

import * as React from 'react';

import type { PlateLeafProps } from 'platejs/react';

import { PlateLeaf } from 'platejs/react';
import { EDITOR_INLINE_CODE_CLASSNAME } from './inline-code-style';

export function CodeLeaf(props: PlateLeafProps) {
  return (
    <PlateLeaf
      {...props}
      as="code"
      className={EDITOR_INLINE_CODE_CLASSNAME}
    >
      {props.children}
    </PlateLeaf>
  );
}
