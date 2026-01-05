/**
 * Source Registry - Main Export
 * Source Discovery + Validation Service for Lyceum
 */

// Types
export * from './types';
export * from './module-grounding-types';

// Services
export { RegistryService } from './registry-service';
export { fetcher, Fetcher } from './fetcher';
export { logger, RegistryLogger } from './logger';

// Module Grounding Services
export { ModuleGroundingService } from './module-grounding-service';
export { 
  selectNodesForModule, 
  resolveNodesForModule 
} from './module-node-resolver';
export { 
  extractContentFromUrl, 
  retrieveNodesContent, 
  buildCitations, 
  formatCitationsDisplay 
} from './module-content-retriever';
export { 
  synthesizeModuleContent, 
  renderModuleOnDemand 
} from './module-content-synthesizer';
export { DynamicSourceFetcher } from './dynamic-source-fetcher';
export { WebDocsSearcher, KNOWN_DOC_SOURCES } from './web-docs-searcher';
export type { DocSource, WebSearchResult, DocMatchResult } from './web-docs-searcher';

// Adapters
export {
  getAdapter,
  BaseAdapter,
  OpenStaxAdapter,
  openStaxAdapter,
  SphinxDocsAdapter,
  sphinxDocsAdapter,
  GenericHtmlTocAdapter,
  genericHtmlAdapter,
} from './adapters';

// Seeds
export {
  SEED_SOURCES,
  ALLOWED_DOMAINS,
  getSeedByName,
  getSeedsByType,
  isDomainAllowed,
  isUrlAllowed,
} from './seeds';


