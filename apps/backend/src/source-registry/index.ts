/**
 * Source Registry - Main Export
 * Source Discovery + Validation Service for Lyceum
 */

// Types
export * from './types';

// Services
export { RegistryService } from './registry-service';
export { fetcher, Fetcher } from './fetcher';
export { logger, RegistryLogger } from './logger';

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


