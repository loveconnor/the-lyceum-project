/**
 * OpenStax Adapter
 * Discovers and maps OpenStax textbooks
 * 
 * OpenStax provides free, peer-reviewed, openly licensed textbooks.
 * All content is CC BY licensed.
 */

import * as cheerio from 'cheerio';
import { BaseAdapter } from './base-adapter';
import type { AssetCandidate, ValidationResult, TocNode, SourceType, NodeType } from '../types';
import { fetcher } from '../fetcher';

export class OpenStaxAdapter extends BaseAdapter {
  readonly sourceType: SourceType = 'openstax';
  
  private readonly openstaxBaseUrl = 'https://openstax.org';
  private readonly cmsApiUrl = 'https://openstax.org/apps/cms/api';
  private readonly cnxBaseUrl = 'https://openstax.org/books';

  /**
   * Discover OpenStax books using the CMS API
   */
  async discoverAssets(seedUrl: string, config?: Record<string, unknown>): Promise<AssetCandidate[]> {
    this.log('info', 'discover', `Discovering OpenStax books via CMS API`);
    
    const assets: AssetCandidate[] = [];
    
    // Fetch book index from CMS API
    const result = await fetcher.fetch(`${this.cmsApiUrl}/books/`);
    if (!result.ok || !result.html) {
      throw new Error(`Failed to fetch books API: ${result.error}`);
    }
    
    try {
      const data = JSON.parse(result.html);
      const books = data.books || [];
      
      this.log('debug', 'discover', `API returned ${books.length} books`);
      
      for (const book of books) {
        // Only include live books
        if (book.book_state !== 'live') {
          this.log('debug', 'discover', `Skipping non-live book: ${book.title} (${book.book_state})`);
          continue;
        }
        
        let slug = book.slug || book.meta?.slug;
        if (!slug) continue;
        
        // Remove any 'books/' prefix from slug
        slug = slug.replace(/^books\//, '');
        
        assets.push({
          slug,
          title: book.title,
          url: `${this.cnxBaseUrl}/${slug}/pages/1-introduction`,
          description: this.stripHtml(book.description) || undefined,
          metadata: {
            cnxId: book.cnx_id,
            bookUuid: book.book_uuid,
            detailsUrl: `${this.openstaxBaseUrl}/details/books/${slug}`,
            coverUrl: book.cover_url,
            subjects: book.book_subjects?.map((s: { subject_name: string }) => s.subject_name) || [],
            categories: book.book_categories?.map((c: { subject_category: string }) => c.subject_category) || [],
            publishDate: book.publish_date,
          },
        });
      }
    } catch (err) {
      throw new Error(`Failed to parse books API response: ${(err as Error).message}`);
    }
    
    this.log('info', 'discover', `Discovered ${assets.length} OpenStax books`);
    return assets;
  }
  
  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Validate an OpenStax book
   * OpenStax content is all CC BY 4.0 licensed
   */
  async validate(asset: AssetCandidate, baseUrl: string): Promise<ValidationResult> {
    const baseResult = await super.validate(asset, baseUrl);
    
    // OpenStax is known to be CC BY 4.0
    // We set high confidence since this is their stated license
    if (!baseResult.license_name || baseResult.license_confidence < 0.9) {
      baseResult.license_name = 'CC BY 4.0';
      baseResult.license_url = 'https://creativecommons.org/licenses/by/4.0/';
      baseResult.license_confidence = 0.95;
    }
    
    return baseResult;
  }

  /**
   * Map the TOC of an OpenStax book
   * Extracts from __PRELOADED_STATE__ embedded in the book page
   */
  async mapToc(asset: AssetCandidate, baseUrl: string): Promise<TocNode[]> {
    this.log('info', 'map-toc', `Mapping TOC for ${asset.title}`);
    
    const result = await fetcher.fetch(asset.url);
    if (!result.ok || !result.html) {
      this.log('error', 'map-toc', `Failed to fetch book page: ${result.error}`);
      return [];
    }
    
    // Extract __PRELOADED_STATE__ which contains the TOC tree
    const preloadMatch = result.html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
    if (!preloadMatch) {
      this.log('warn', 'map-toc', 'Could not find __PRELOADED_STATE__ in page');
      return [];
    }
    
    let preloadedState: any;
    try {
      preloadedState = JSON.parse(preloadMatch[1]);
    } catch (err) {
      this.log('error', 'map-toc', `Failed to parse __PRELOADED_STATE__: ${(err as Error).message}`);
      return [];
    }
    
    // Navigate to the tree structure
    // The tree is typically at page.book.tree or content.book.tree
    const tree = preloadedState?.page?.book?.tree || 
                 preloadedState?.content?.book?.tree ||
                 preloadedState?.book?.tree ||
                 this.findTreeInObject(preloadedState);
    
    if (!tree || !tree.contents) {
      this.log('warn', 'map-toc', 'Could not find tree structure in preloaded state');
      return [];
    }
    
    const nodes: TocNode[] = [];
    let sortOrder = 0;
    
    // Parse the TOC tree recursively
    const parseTreeContents = (contents: any[], depth: number): TocNode[] => {
      const levelNodes: TocNode[] = [];
      
      for (const item of contents) {
        // Clean title (remove HTML tags)
        const title = this.stripHtml(item.title);
        if (!title) continue;
        
        // Build URL from slug
        const pageSlug = item.slug || '';
        const url = pageSlug 
          ? `${this.cnxBaseUrl}/${asset.slug}/pages/${pageSlug}`
          : asset.url;
        
        // Determine node type based on toc_type or depth
        let nodeType: NodeType = 'section';
        if (item.toc_type === 'book-content') {
          if (item.toc_target_type === 'chapter') {
            nodeType = 'chapter';
          } else if (item.toc_target_type === 'preface' || item.toc_target_type === 'appendix') {
            nodeType = 'section';
          }
        } else if (depth === 0) {
          // Top level items with children are likely chapters/units
          nodeType = item.contents?.length > 0 ? 'chapter' : 'section';
        } else if (depth === 1) {
          nodeType = 'section';
        } else {
          nodeType = 'subsection';
        }
        
        const node: TocNode = {
          slug: this.slugify(`${asset.slug}-${pageSlug || title}-${sortOrder}`),
          title,
          url,
          node_type: nodeType,
          depth,
          sort_order: sortOrder++,
          metadata: {
            tocType: item.toc_type,
            tocTargetType: item.toc_target_type,
          },
        };
        
        // Recursively parse children
        if (item.contents && item.contents.length > 0) {
          node.children = parseTreeContents(item.contents, depth + 1);
        }
        
        levelNodes.push(node);
      }
      
      return levelNodes;
    };
    
    const treeNodes = parseTreeContents(tree.contents, 0);
    nodes.push(...this.flattenToc(treeNodes));
    
    this.log('info', 'map-toc', `Mapped ${nodes.length} TOC nodes for ${asset.title}`);
    return nodes;
  }
  
  /**
   * Recursively search for a tree object in the preloaded state
   */
  private findTreeInObject(obj: any, depth = 0): any {
    if (depth > 5 || !obj || typeof obj !== 'object') return null;
    
    if (obj.tree && obj.tree.contents) {
      return obj.tree;
    }
    
    for (const value of Object.values(obj)) {
      const found = this.findTreeInObject(value, depth + 1);
      if (found) return found;
    }
    
    return null;
  }

  /**
   * Determine node type based on title and depth
   */
  private determineNodeType(title: string, depth: number): NodeType {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('preface') || lowerTitle.includes('introduction')) {
      return 'section';
    }
    if (lowerTitle.match(/^(part|unit)\s+\d+/i)) {
      return 'part';
    }
    if (lowerTitle.match(/^chapter\s+\d+/i) || depth === 0) {
      return 'chapter';
    }
    if (depth === 1) {
      return 'section';
    }
    if (depth >= 2) {
      return 'subsection';
    }
    
    return 'section';
  }

  /**
   * Get selector hints for OpenStax content extraction
   */
  getSelectorHints(): Record<string, string> {
    return {
      content: '.main-content, [data-type="page"], .content',
      title: 'h1, .title, [data-type="document-title"]',
      toc: '.table-of-contents, #toc, nav[aria-label="Table of Contents"]',
      license: '.license, [data-type="license"]',
    };
  }
}

export const openStaxAdapter = new OpenStaxAdapter();

