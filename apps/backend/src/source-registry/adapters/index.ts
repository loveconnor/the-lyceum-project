/**
 * Source Registry Adapters
 * Export all adapters and adapter factory
 */

export { BaseAdapter } from './base-adapter';
export { OpenStaxAdapter, openStaxAdapter } from './openstax-adapter';
export { SphinxDocsAdapter, sphinxDocsAdapter } from './sphinx-docs-adapter';
export { GenericHtmlTocAdapter, genericHtmlAdapter } from './generic-html-adapter';

import type { SourceAdapter, SourceType } from '../types';
import { openStaxAdapter } from './openstax-adapter';
import { sphinxDocsAdapter } from './sphinx-docs-adapter';
import { genericHtmlAdapter } from './generic-html-adapter';

/**
 * Get adapter instance by source type
 */
export function getAdapter(sourceType: SourceType): SourceAdapter {
  switch (sourceType) {
    case 'openstax':
      return openStaxAdapter;
    case 'sphinx_docs':
      return sphinxDocsAdapter;
    case 'generic_html':
      return genericHtmlAdapter;
    case 'custom':
      // Custom adapters should be instantiated separately
      return genericHtmlAdapter;
    default:
      throw new Error(`Unknown source type: ${sourceType}`);
  }
}


