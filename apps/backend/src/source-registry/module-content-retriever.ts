/**
 * Module Content Retriever
 * Fetches and extracts content from source registry nodes on demand
 */

import * as cheerio from 'cheerio';
import type { TocNode, Asset } from './types';
import type { ExtractedContent, ExtractedFigure, Citation } from './module-grounding-types';
import { fetcher } from './fetcher';
import { logger } from './logger';

/**
 * Default CSS selectors for content extraction
 * These work for OpenStax and similar educational content
 */
const DEFAULT_CONTENT_SELECTORS = {
  content: '.main-content, [data-type="page"], .content, article, main, .book-content',
  title: 'h1, .title, [data-type="document-title"]',
  paragraph: 'p, [data-type="para"]',
  heading: 'h1, h2, h3, h4, h5, h6',
  figure: 'figure, .figure, [data-type="figure"]',
  figcaption: 'figcaption, .caption, [data-type="caption"]',
  image: 'img',
  // Elements to exclude from content extraction
  exclude: 'nav, .nav, .sidebar, .toc, .table-of-contents, header, footer, .header, .footer, script, style, [data-type="note"], .os-eoc, .os-teacher, .os-solutions',
};

/**
 * Extract clean text content from a URL
 */
export async function extractContentFromUrl(
  url: string,
  selectorHints?: Record<string, string>
): Promise<{
  title: string;
  content_text: string;
  headings: string[];
  figures: ExtractedFigure[];
} | null> {
  const startTime = Date.now();
  
  logger.info('content-retriever', `Fetching content from: ${url}`);

  const result = await fetcher.fetch(url);
  
  if (!result.ok || !result.html) {
    logger.error('content-retriever', `Failed to fetch: ${url}`, {
      details: { status: result.status, error: result.error },
    });
    return null;
  }

  const $ = cheerio.load(result.html);
  const selectors = { ...DEFAULT_CONTENT_SELECTORS, ...selectorHints };

  // Remove excluded elements
  $(selectors.exclude).remove();

  // Find main content area
  const contentArea = $(selectors.content).first();
  if (contentArea.length === 0) {
    logger.warn('content-retriever', `No content area found for: ${url}`);
    return null;
  }

  // Extract title
  const title = $(selectors.title).first().text().trim() || 'Untitled';

  // Extract headings for structure
  const headings: string[] = [];
  contentArea.find(selectors.heading).each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  // Extract paragraphs and text content
  const paragraphs: string[] = [];
  contentArea.find(selectors.paragraph).each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) { // Skip very short paragraphs
      paragraphs.push(text);
    }
  });

  // If no paragraphs found, get all text content
  let content_text = paragraphs.join('\n\n');
  if (!content_text) {
    content_text = contentArea.text()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract figures and images
  const figures: ExtractedFigure[] = [];
  contentArea.find(selectors.figure).each((_, el) => {
    const figure = $(el);
    const img = figure.find(selectors.image).first();
    const caption = figure.find(selectors.figcaption).text().trim();
    
    let imgUrl = img.attr('src') || '';
    const alt = img.attr('alt') || '';
    
    // Make relative URLs absolute
    if (imgUrl && !imgUrl.startsWith('http')) {
      try {
        imgUrl = new URL(imgUrl, url).href;
      } catch {
        // Keep as-is if URL construction fails
      }
    }

    if (imgUrl) {
      figures.push({
        url: imgUrl,
        alt: alt || undefined,
        caption: caption || undefined,
      });
    }
  });

  // Also extract standalone images not in figures
  contentArea.find(selectors.image).each((_, el) => {
    const img = $(el);
    // Skip if already in a figure
    if (img.closest(selectors.figure).length > 0) return;
    
    let imgUrl = img.attr('src') || '';
    const alt = img.attr('alt') || '';
    
    if (imgUrl && !imgUrl.startsWith('http')) {
      try {
        imgUrl = new URL(imgUrl, url).href;
      } catch {
        // Keep as-is
      }
    }

    if (imgUrl && !figures.some(f => f.url === imgUrl)) {
      figures.push({
        url: imgUrl,
        alt: alt || undefined,
      });
    }
  });

  const duration = Date.now() - startTime;
  logger.info('content-retriever', `Content extracted from: ${url}`, {
    duration,
    details: {
      titleLength: title.length,
      contentLength: content_text.length,
      headingsCount: headings.length,
      figuresCount: figures.length,
    },
  });

  return {
    title,
    content_text,
    headings,
    figures,
  };
}

/**
 * Retrieve content for multiple registry nodes
 */
export async function retrieveNodesContent(
  nodes: TocNode[],
  asset: Asset,
  maxConcurrent: number = 2
): Promise<ExtractedContent[]> {
  const startTime = Date.now();
  const results: ExtractedContent[] = [];
  
  logger.info('content-retriever', `Retrieving content for ${nodes.length} nodes`, {
    details: { assetTitle: asset.title },
  });

  // Process nodes in batches to respect rate limits
  for (let i = 0; i < nodes.length; i += maxConcurrent) {
    const batch = nodes.slice(i, i + maxConcurrent);
    
    const batchPromises = batch.map(async (node) => {
      try {
        const extracted = await extractContentFromUrl(
          node.url,
          asset.selector_hints as Record<string, string> | undefined
        );

        if (!extracted) {
          logger.warn('content-retriever', `Failed to extract content for node: ${node.title}`, {
            details: { nodeId: node.id, url: node.url },
          });
          return null;
        }

        // Build section path for citation
        const sectionPath = buildSectionPath(node, nodes);

        return {
          node_id: node.id!,
          title: extracted.title || node.title,
          url: node.url,
          content_text: extracted.content_text,
          headings: extracted.headings,
          figures: extracted.figures,
          source_title: asset.title,
          section_path: sectionPath,
        } as ExtractedContent;

      } catch (error) {
        logger.error('content-retriever', `Error extracting node content: ${(error as Error).message}`, {
          details: { nodeId: node.id, url: node.url },
        });
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is ExtractedContent => r !== null));

    // Small delay between batches for rate limiting
    if (i + maxConcurrent < nodes.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const duration = Date.now() - startTime;
  logger.info('content-retriever', `Content retrieval complete`, {
    duration,
    details: {
      requestedNodes: nodes.length,
      successfulNodes: results.length,
    },
  });

  return results;
}

/**
 * Build the section path for a node (e.g., ["Chapter 2", "Section 2.1"])
 */
function buildSectionPath(node: TocNode, allNodes: TocNode[]): string[] {
  const path: string[] = [];
  
  // Find ancestors by walking up parent_ids
  let currentNode: TocNode | undefined = node;
  const nodesById = new Map(allNodes.map(n => [n.id, n]));
  
  while (currentNode) {
    path.unshift(currentNode.title);
    currentNode = currentNode.parent_id ? nodesById.get(currentNode.parent_id) : undefined;
  }
  
  return path;
}

/**
 * Build citations from extracted content
 */
export function buildCitations(extractedContents: ExtractedContent[]): Citation[] {
  return extractedContents.map(content => ({
    source_title: content.source_title,
    section_title: content.title,
    section_path: content.section_path,
    url: content.url,
    node_id: content.node_id,
  }));
}

/**
 * Format citations for display
 * e.g., "Based on OpenStax Calculus, Sections 2.1–2.2"
 */
export function formatCitationsDisplay(citations: Citation[]): string {
  if (citations.length === 0) return '';
  
  const sourceTitle = citations[0].source_title;
  const sectionTitles = citations.map(c => c.section_title);
  
  if (sectionTitles.length === 1) {
    return `Based on ${sourceTitle}, ${sectionTitles[0]}`;
  }
  
  // Try to identify sequential sections
  const numbers = sectionTitles.map(t => {
    const match = t.match(/(\d+(?:\.\d+)*)/);
    return match ? match[1] : null;
  }).filter(Boolean);
  
  if (numbers.length === sectionTitles.length && numbers.length > 0) {
    return `Based on ${sourceTitle}, Sections ${numbers[0]}–${numbers[numbers.length - 1]}`;
  }
  
  // Fall back to listing all
  if (sectionTitles.length <= 3) {
    return `Based on ${sourceTitle}: ${sectionTitles.join(', ')}`;
  }
  
  return `Based on ${sourceTitle}: ${sectionTitles.slice(0, 2).join(', ')} and ${sectionTitles.length - 2} more sections`;
}

