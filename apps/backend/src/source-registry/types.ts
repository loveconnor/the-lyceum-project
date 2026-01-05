/**
 * Source Registry Types
 * Types for the source discovery and validation service
 */

export type SourceType = 'openstax' | 'sphinx_docs' | 'generic_html' | 'custom';
export type RobotsStatus = 'allowed' | 'disallowed' | 'partial' | 'unknown' | 'needs_review';
export type ScanStatus = 'idle' | 'scanning' | 'completed' | 'failed';
export type NodeType = 'root' | 'part' | 'chapter' | 'section' | 'subsection' | 'page' | 'other';
export type ScanAction = 'discover' | 'validate' | 'map_toc' | 'activate' | 'deactivate' | 'error';
export type ScanLogStatus = 'started' | 'completed' | 'failed' | 'skipped';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  base_url: string;
  description?: string;
  license_name?: string;
  license_url?: string;
  license_confidence?: number;
  robots_status: RobotsStatus;
  rate_limit_per_minute: number;
  user_agent: string;
  last_scan_at?: string;
  scan_status?: ScanStatus;
  scan_error?: string;
  config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  source_id: string;
  slug: string;
  title: string;
  url: string;
  description?: string;
  version?: string;
  license_name?: string;
  license_url?: string;
  license_confidence?: number;
  robots_status: RobotsStatus;
  active: boolean;
  toc_extraction_success?: boolean;
  toc_stats?: TocStats;
  selector_hints?: SelectorHints;
  last_scan_at?: string;
  scan_status?: ScanStatus;
  scan_error?: string;
  validation_report?: ValidationReport;
  created_at: string;
  updated_at: string;
}

export interface TocNode {
  id?: string;
  asset_id?: string;
  parent_id?: string | null;
  slug: string;
  title: string;
  url: string;
  node_type: NodeType;
  depth: number;
  sort_order: number;
  selector_hints?: SelectorHints;
  metadata?: Record<string, unknown>;
  children?: TocNode[]; // For in-memory hierarchy building
}

export interface ScanLog {
  id: string;
  source_id?: string;
  asset_id?: string;
  action: ScanAction;
  status: ScanLogStatus;
  message?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface TocStats {
  chapters: number;
  sections: number;
  total_nodes: number;
  depth: number;
}

export interface SelectorHints {
  content?: string;
  title?: string;
  toc?: string;
  license?: string;
  [key: string]: string | undefined;
}

export interface ValidationReport {
  license_name?: string;
  license_url?: string;
  license_confidence?: number;
  robots_status: RobotsStatus;
  toc_extraction_success: boolean;
  toc_stats?: TocStats;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  scanned_at: string;
}

export interface ValidationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Adapter interfaces
export interface AssetCandidate {
  slug: string;
  title: string;
  url: string;
  description?: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  license_name?: string;
  license_url?: string;
  license_confidence?: number;
  robots_status: RobotsStatus;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface SourceAdapter {
  readonly sourceType: SourceType;
  
  /**
   * Discover assets from a seed URL
   */
  discoverAssets(seedUrl: string, config?: Record<string, unknown>): Promise<AssetCandidate[]>;
  
  /**
   * Validate an asset (check license, robots.txt, etc.)
   */
  validate(asset: AssetCandidate, baseUrl: string): Promise<ValidationResult>;
  
  /**
   * Map the TOC structure of an asset
   */
  mapToc(asset: AssetCandidate, baseUrl: string): Promise<TocNode[]>;
}

// Fetcher types
export interface FetchOptions {
  domainKey?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  html?: string;
  error?: string;
  url: string;
  redirected: boolean;
  finalUrl: string;
}

export interface RobotsResult {
  allowed: boolean;
  crawlDelay?: number;
  sitemaps: string[];
}

// Seed configuration
export interface SeedConfig {
  name: string;
  type: SourceType;
  baseUrl: string;
  seedUrl: string;
  description?: string;
  rateLimitPerMinute?: number;
  config?: Record<string, unknown>;
}

// Logging
export interface StructuredLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: 'source-registry';
  action: string;
  message: string;
  sourceId?: string;
  assetId?: string;
  url?: string;
  duration?: number;
  details?: Record<string, unknown>;
}

// Scan options
export interface ScanOptions {
  skipScanned?: boolean; // Skip assets that have already been successfully scanned
}


