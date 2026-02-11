import * as React from 'react';

import type { SlateLeafProps } from 'platejs/static';

import { SlateLeaf } from 'platejs/static';
import { EDITOR_INLINE_CODE_CLASSNAME } from './inline-code-style';

export function CodeLeafStatic(props: SlateLeafProps) {
  return (
    <SlateLeaf
      {...props}
      as="code"
      className={EDITOR_INLINE_CODE_CLASSNAME}
    >
      {props.children}
    </SlateLeaf>
  );
}
