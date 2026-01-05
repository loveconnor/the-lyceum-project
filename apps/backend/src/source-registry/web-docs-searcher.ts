/**
 * Web Documentation Searcher
 * Searches the web for documentation when OpenStax doesn't have relevant content
 * 
 * Supports:
 * - Curated documentation sources (official docs, MDN, etc.)
 * - Web search via DuckDuckGo (no API key needed)
 * - Automatic adapter selection based on doc type
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Asset, TocNode, AssetCandidate } from './types';
import type { TocNodeSummary } from './module-grounding-types';
import { genericHtmlAdapter, sphinxDocsAdapter } from './adapters';
import { fetcher } from './fetcher';
import { logger } from './logger';

export interface DocSource {
  name: string;
  slug: string;
  baseUrl: string;
  docUrl: string;
  type: 'sphinx' | 'generic' | 'mdx' | 'gitbook';
  keywords: string[];
  description: string;
  license: string;
  licenseUrl: string;
}

// Curated list of known documentation sources
// These are high-quality, freely accessible documentation sites
export const KNOWN_DOC_SOURCES: DocSource[] = [
  // Programming Languages
  {
    name: 'Dev.java - Learn Java',
    slug: 'dev-java',
    baseUrl: 'https://dev.java',
    docUrl: 'https://dev.java/learn/',
    type: 'generic',
    keywords: ['java', 'jdk', 'jvm', 'programming', 'oop', 'object-oriented'],
    description: 'Official Oracle Java Developer Portal - modern Java learning resources',
    license: 'Oracle Technology Network License',
    licenseUrl: 'https://www.oracle.com/legal/terms.html',
  },
  {
    name: 'Java Programming (Wikibooks)',
    slug: 'java-wikibooks',
    baseUrl: 'https://en.wikibooks.org',
    docUrl: 'https://en.wikibooks.org/wiki/Java_Programming',
    type: 'generic',
    keywords: ['java', 'jdk', 'jvm', 'programming', 'oop', 'beginner'],
    description: 'Free, open Java programming textbook from Wikibooks',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    name: 'Python Documentation',
    slug: 'python-docs',
    baseUrl: 'https://docs.python.org',
    docUrl: 'https://docs.python.org/3/tutorial/index.html',
    type: 'sphinx',
    keywords: ['python', 'programming', 'scripting', 'language'],
    description: 'Official Python programming language documentation',
    license: 'PSF License',
    licenseUrl: 'https://docs.python.org/3/license.html',
  },
  {
    name: 'MDN Web Docs - JavaScript',
    slug: 'mdn-javascript',
    baseUrl: 'https://developer.mozilla.org',
    docUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
    type: 'generic',
    keywords: ['javascript', 'js', 'web', 'ecmascript', 'programming'],
    description: 'MDN JavaScript Guide and Reference',
    license: 'CC BY-SA 2.5',
    licenseUrl: 'https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license',
  },
  {
    name: 'MDN Web Docs - HTML',
    slug: 'mdn-html',
    baseUrl: 'https://developer.mozilla.org',
    docUrl: 'https://developer.mozilla.org/en-US/docs/Learn/HTML',
    type: 'generic',
    keywords: ['html', 'web', 'markup', 'frontend'],
    description: 'MDN HTML Learning Guide',
    license: 'CC BY-SA 2.5',
    licenseUrl: 'https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license',
  },
  {
    name: 'MDN Web Docs - CSS',
    slug: 'mdn-css',
    baseUrl: 'https://developer.mozilla.org',
    docUrl: 'https://developer.mozilla.org/en-US/docs/Learn/CSS',
    type: 'generic',
    keywords: ['css', 'stylesheet', 'web', 'styling', 'frontend'],
    description: 'MDN CSS Learning Guide',
    license: 'CC BY-SA 2.5',
    licenseUrl: 'https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license',
  },
  {
    name: 'Rust Book',
    slug: 'rust-book',
    baseUrl: 'https://doc.rust-lang.org',
    docUrl: 'https://doc.rust-lang.org/book/',
    type: 'generic',
    keywords: ['rust', 'programming', 'systems', 'memory', 'safety'],
    description: 'The Rust Programming Language book',
    license: 'MIT/Apache 2.0',
    licenseUrl: 'https://github.com/rust-lang/book/blob/main/LICENSE-MIT',
  },
  {
    name: 'Go Documentation',
    slug: 'go-docs',
    baseUrl: 'https://go.dev',
    docUrl: 'https://go.dev/doc/',
    type: 'generic',
    keywords: ['go', 'golang', 'programming', 'concurrency'],
    description: 'Official Go programming language documentation',
    license: 'BSD License',
    licenseUrl: 'https://go.dev/LICENSE',
  },
  // Frameworks
  {
    name: 'React Documentation',
    slug: 'react-docs',
    baseUrl: 'https://react.dev',
    docUrl: 'https://react.dev/learn',
    type: 'generic',
    keywords: ['react', 'reactjs', 'javascript', 'frontend', 'ui', 'component'],
    description: 'Official React documentation and learning guides',
    license: 'CC BY 4.0',
    licenseUrl: 'https://github.com/reactjs/react.dev/blob/main/LICENSE-DOCS.md',
  },
  {
    name: 'Vue.js Documentation',
    slug: 'vue-docs',
    baseUrl: 'https://vuejs.org',
    docUrl: 'https://vuejs.org/guide/introduction.html',
    type: 'generic',
    keywords: ['vue', 'vuejs', 'javascript', 'frontend', 'framework'],
    description: 'Official Vue.js documentation',
    license: 'MIT',
    licenseUrl: 'https://github.com/vuejs/docs/blob/main/LICENSE',
  },
  {
    name: 'Next.js Documentation',
    slug: 'nextjs-docs',
    baseUrl: 'https://nextjs.org',
    docUrl: 'https://nextjs.org/docs',
    type: 'generic',
    keywords: ['nextjs', 'next', 'react', 'ssr', 'fullstack', 'framework'],
    description: 'Official Next.js documentation',
    license: 'MIT',
    licenseUrl: 'https://github.com/vercel/next.js/blob/canary/license.md',
  },
  {
    name: 'Django Documentation',
    slug: 'django-docs',
    baseUrl: 'https://docs.djangoproject.com',
    docUrl: 'https://docs.djangoproject.com/en/stable/intro/tutorial01/',
    type: 'sphinx',
    keywords: ['django', 'python', 'web', 'backend', 'framework'],
    description: 'Official Django web framework documentation',
    license: 'BSD License',
    licenseUrl: 'https://github.com/django/django/blob/main/LICENSE',
  },
  {
    name: 'Node.js Documentation',
    slug: 'nodejs-docs',
    baseUrl: 'https://nodejs.org',
    docUrl: 'https://nodejs.org/docs/latest/api/',
    type: 'generic',
    keywords: ['nodejs', 'node', 'javascript', 'backend', 'runtime'],
    description: 'Official Node.js API documentation',
    license: 'MIT',
    licenseUrl: 'https://github.com/nodejs/node/blob/main/LICENSE',
  },
  {
    name: 'Express.js Documentation',
    slug: 'express-docs',
    baseUrl: 'https://expressjs.com',
    docUrl: 'https://expressjs.com/en/starter/installing.html',
    type: 'generic',
    keywords: ['express', 'expressjs', 'nodejs', 'backend', 'api', 'web'],
    description: 'Express.js web framework documentation',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://github.com/expressjs/expressjs.com/blob/gh-pages/LICENSE.md',
  },
  // Databases
  {
    name: 'PostgreSQL Documentation',
    slug: 'postgresql-docs',
    baseUrl: 'https://www.postgresql.org',
    docUrl: 'https://www.postgresql.org/docs/current/tutorial.html',
    type: 'generic',
    keywords: ['postgresql', 'postgres', 'sql', 'database', 'relational'],
    description: 'PostgreSQL database documentation',
    license: 'PostgreSQL License',
    licenseUrl: 'https://www.postgresql.org/about/licence/',
  },
  {
    name: 'MongoDB Documentation',
    slug: 'mongodb-docs',
    baseUrl: 'https://www.mongodb.com',
    docUrl: 'https://www.mongodb.com/docs/manual/introduction/',
    type: 'generic',
    keywords: ['mongodb', 'mongo', 'nosql', 'database', 'document'],
    description: 'MongoDB documentation and tutorials',
    license: 'CC BY-NC-SA 3.0',
    licenseUrl: 'https://www.mongodb.com/legal/documentation-license',
  },
  // DevOps & Tools
  {
    name: 'Docker Documentation',
    slug: 'docker-docs',
    baseUrl: 'https://docs.docker.com',
    docUrl: 'https://docs.docker.com/get-started/',
    type: 'generic',
    keywords: ['docker', 'container', 'devops', 'deployment', 'virtualization'],
    description: 'Docker containerization documentation',
    license: 'Apache 2.0',
    licenseUrl: 'https://github.com/docker/docs/blob/main/LICENSE',
  },
  {
    name: 'Git Documentation',
    slug: 'git-docs',
    baseUrl: 'https://git-scm.com',
    docUrl: 'https://git-scm.com/book/en/v2',
    type: 'generic',
    keywords: ['git', 'version', 'control', 'vcs', 'github'],
    description: 'Pro Git book - comprehensive Git documentation',
    license: 'CC BY-NC-SA 3.0',
    licenseUrl: 'https://git-scm.com/book/en/v2',
  },
  {
    name: 'Kubernetes Documentation',
    slug: 'kubernetes-docs',
    baseUrl: 'https://kubernetes.io',
    docUrl: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/',
    type: 'generic',
    keywords: ['kubernetes', 'k8s', 'container', 'orchestration', 'devops'],
    description: 'Kubernetes container orchestration documentation',
    license: 'CC BY 4.0',
    licenseUrl: 'https://github.com/kubernetes/website/blob/main/LICENSE',
  },
  // Data Science
  {
    name: 'NumPy Documentation',
    slug: 'numpy-docs',
    baseUrl: 'https://numpy.org',
    docUrl: 'https://numpy.org/doc/stable/user/absolute_beginners.html',
    type: 'sphinx',
    keywords: ['numpy', 'python', 'array', 'numerical', 'data', 'science'],
    description: 'NumPy numerical computing library documentation',
    license: 'BSD License',
    licenseUrl: 'https://numpy.org/doc/stable/license.html',
  },
  {
    name: 'Pandas Documentation',
    slug: 'pandas-docs',
    baseUrl: 'https://pandas.pydata.org',
    docUrl: 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/',
    type: 'sphinx',
    keywords: ['pandas', 'python', 'dataframe', 'data', 'analysis'],
    description: 'Pandas data analysis library documentation',
    license: 'BSD License',
    licenseUrl: 'https://github.com/pandas-dev/pandas/blob/main/LICENSE',
  },
  // TypeScript
  {
    name: 'TypeScript Documentation',
    slug: 'typescript-docs',
    baseUrl: 'https://www.typescriptlang.org',
    docUrl: 'https://www.typescriptlang.org/docs/handbook/intro.html',
    type: 'generic',
    keywords: ['typescript', 'ts', 'javascript', 'types', 'programming'],
    description: 'Official TypeScript handbook and documentation',
    license: 'Apache 2.0',
    licenseUrl: 'https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt',
  },
];

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export interface DocMatchResult {
  source: DocSource;
  score: number;
  matchedKeywords: string[];
}

/**
 * Web Documentation Searcher Service
 */
export class WebDocsSearcher {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Search for matching documentation from curated sources
   */
  searchKnownDocs(query: string): DocMatchResult[] {
    const queryTerms = this.tokenize(query);
    const results: DocMatchResult[] = [];

    for (const source of KNOWN_DOC_SOURCES) {
      const matchResult = this.calculateDocMatch(source, queryTerms);
      if (matchResult.score > 0) {
        results.push(matchResult);
      }
    }

    results.sort((a, b) => b.score - a.score);
    
    logger.info('web-docs', `Found ${results.length} matching docs for "${query}"`, {
      details: { topMatches: results.slice(0, 3).map(r => r.source.name) }
    });

    return results;
  }

  /**
   * Find the best matching documentation source
   */
  findBestDoc(query: string): DocSource | null {
    const results = this.searchKnownDocs(query);
    
    // Require minimum score of 10 for a meaningful match
    if (results.length > 0 && results[0].score >= 10) {
      return results[0].source;
    }
    
    return null;
  }

  /**
   * Search the web using DuckDuckGo HTML (no API key needed)
   * Falls back to this when no curated source matches
   */
  async searchWeb(query: string): Promise<WebSearchResult[]> {
    const searchQuery = `${query} documentation tutorial site:docs OR site:developer OR site:learn`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    logger.info('web-docs', `Searching web for: "${query}"`);
    console.log(`[WebDocs] Searching DuckDuckGo for: "${searchQuery}"`);

    try {
      const result = await fetcher.fetch(searchUrl, { timeout: 10000 });

      if (!result.ok || !result.html) {
        logger.warn('web-docs', 'Web search failed', { details: { error: result.error } });
        return [];
      }

      const cheerio = await import('cheerio');
      const $ = cheerio.load(result.html);
      const results: WebSearchResult[] = [];

      // Parse DuckDuckGo HTML results
      $('.result').each((i, el) => {
        if (results.length >= 10) return;

        const $el = $(el);
        const $link = $el.find('.result__a');
        const title = $link.text().trim();
        const url = $link.attr('href') || '';
        const snippet = $el.find('.result__snippet').text().trim();

        if (title && url && url.startsWith('http')) {
          try {
            const domain = new URL(url).hostname;
            results.push({ title, url, snippet, domain });
          } catch {
            // Skip invalid URLs
          }
        }
      });

      console.log(`[WebDocs] Found ${results.length} web results`);
      logger.info('web-docs', `Web search returned ${results.length} results`);

      return results;

    } catch (error) {
      logger.error('web-docs', `Web search error: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Get or create an asset in the registry for a documentation source
   */
  async getOrCreateDocAsset(docSource: DocSource): Promise<Asset> {
    console.log(`[WebDocs] Checking if asset exists for: ${docSource.name}`);
    
    // Check if asset already exists
    const { data: existing } = await this.supabase
      .from('source_registry_assets')
      .select('*')
      .eq('slug', docSource.slug)
      .single();

    if (existing) {
      console.log(`[WebDocs] ✓ Found existing asset (ID: ${existing.id})`);
      return existing as Asset;
    }

    console.log(`[WebDocs] Creating new asset for: ${docSource.name}`);

    // Get or create source
    const source = await this.getOrCreateDocSource(docSource);

    // Create the asset
    const { data: created, error } = await this.supabase
      .from('source_registry_assets')
      .insert({
        source_id: source.id,
        slug: docSource.slug,
        title: docSource.name,
        url: docSource.docUrl,
        description: docSource.description,
        license_name: docSource.license,
        license_url: docSource.licenseUrl,
        license_confidence: 0.9,
        robots_status: 'allowed',
        active: true,
        scan_status: 'idle',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create asset: ${error.message}`);
    }

    console.log(`[WebDocs] ✓ Created new asset (ID: ${created.id})`);
    logger.info('web-docs', `Created asset for ${docSource.name}`, { details: { assetId: created.id } });

    return created as Asset;
  }

  /**
   * Get or create source for a documentation site
   */
  private async getOrCreateDocSource(docSource: DocSource) {
    const sourceName = `${docSource.name} (${new URL(docSource.baseUrl).hostname})`;
    
    const { data: existing } = await this.supabase
      .from('source_registry_sources')
      .select('*')
      .eq('base_url', docSource.baseUrl)
      .single();

    if (existing) return existing;

    const { data: created, error } = await this.supabase
      .from('source_registry_sources')
      .insert({
        name: sourceName,
        type: docSource.type === 'sphinx' ? 'sphinx_docs' : 'generic_html',
        base_url: docSource.baseUrl,
        description: docSource.description,
        license_name: docSource.license,
        license_url: docSource.licenseUrl,
        license_confidence: 0.9,
        robots_status: 'allowed',
        rate_limit_per_minute: 10, // Be conservative with external docs
        scan_status: 'idle',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create source: ${error.message}`);
    }

    return created;
  }

  /**
   * Fetch and save TOC for a documentation asset
   */
  async getTocForDocAsset(asset: Asset, docSource: DocSource): Promise<TocNode[]> {
    console.log(`[WebDocs] Checking for cached TOC: ${asset.title}`);
    
    // Check if we have TOC in registry
    const { data: existingNodes } = await this.supabase
      .from('source_registry_nodes')
      .select('*')
      .eq('asset_id', asset.id)
      .order('sort_order');

    if (existingNodes && existingNodes.length > 0) {
      console.log(`[WebDocs] ✓ Found cached TOC (${existingNodes.length} nodes)`);
      return existingNodes as TocNode[];
    }

    // Fetch TOC live
    console.log(`[WebDocs] Fetching TOC from: ${docSource.docUrl}`);
    logger.info('web-docs', `Fetching TOC for ${asset.title}`);

    const candidate: AssetCandidate = {
      slug: asset.slug,
      title: asset.title,
      url: docSource.docUrl,
      description: asset.description || undefined,
    };

    let tocNodes: TocNode[];
    
    if (docSource.type === 'sphinx') {
      tocNodes = await sphinxDocsAdapter.mapToc(candidate, docSource.baseUrl);
    } else {
      tocNodes = await genericHtmlAdapter.mapToc(candidate, docSource.baseUrl);
    }

    if (tocNodes.length === 0) {
      console.log(`[WebDocs] ⚠️ No TOC nodes extracted`);
      
      // Try to create basic structure from page content
      tocNodes = await this.extractBasicStructure(docSource);
    }

    if (tocNodes.length > 0) {
      console.log(`[WebDocs] ✓ Extracted ${tocNodes.length} TOC nodes`);
      await this.saveTocToRegistry(asset.id, tocNodes);
    }

    return tocNodes;
  }

  /**
   * Extract basic structure from a page when standard TOC extraction fails
   */
  private async extractBasicStructure(docSource: DocSource): Promise<TocNode[]> {
    console.log(`[WebDocs] Attempting basic structure extraction`);
    
    const result = await fetcher.fetch(docSource.docUrl);
    if (!result.ok || !result.html) return [];

    const cheerio = await import('cheerio');
    const $ = cheerio.load(result.html);
    const nodes: TocNode[] = [];
    const seenUrls = new Set<string>();
    let order = 0;

    // Helper to add a node
    const addNode = (href: string, title: string, depth: number = 1): boolean => {
      if (!href || !title || title.length > 100 || title.length < 3) return false;
      
      let fullUrl: string;
      try {
        fullUrl = new URL(href, docSource.docUrl).href;
      } catch {
        return false;
      }

      // Skip external links, anchors only, and duplicates
      const baseDomain = new URL(docSource.baseUrl).hostname;
      const urlDomain = new URL(fullUrl).hostname;
      if (!urlDomain.includes(baseDomain.replace('www.', ''))) return false;
      if (href === '#' || (href.startsWith('#') && href.length < 3)) return false;
      if (seenUrls.has(fullUrl)) return false;

      seenUrls.add(fullUrl);
      
      nodes.push({
        id: '',
        asset_id: '',
        slug: this.slugify(title),
        title: title.replace(/\s+/g, ' ').trim(),
        url: fullUrl,
        node_type: depth === 0 ? 'chapter' : 'section',
        depth,
        sort_order: order++,
      } as TocNode);

      return true;
    };

    // Strategy 1: Look for main content links (h2/h3 with links, or link lists)
    const mainContentSelectors = [
      'main a', 'article a', '.content a', '#content a',
      '.main-content a', '[role="main"] a'
    ];

    for (const selector of mainContentSelectors) {
      $(selector).each((_, el) => {
        if (nodes.length >= 50) return false;
        
        const $el = $(el);
        const href = $el.attr('href') || '';
        let title = $el.text().trim();
        
        // Skip very short titles or navigation links
        if (title.length < 5) return;
        if (['home', 'back', 'next', 'previous', 'skip'].some(w => title.toLowerCase() === w)) return;
        
        addNode(href, title);
      });

      if (nodes.length > 10) break;
    }

    // Strategy 2: Find navigation or sidebar links
    if (nodes.length < 5) {
      const navSelectors = [
        'nav a', '.sidebar a', '.toc a', '.navigation a',
        '[role="navigation"] a', '.menu a', '.nav-list a',
        '.table-of-contents a', '#toc a', '.index a'
      ];

      for (const selector of navSelectors) {
        $(selector).each((_, el) => {
          if (nodes.length >= 50) return false;
          const $el = $(el);
          addNode($el.attr('href') || '', $el.text().trim());
        });

        if (nodes.length > 5) break;
      }
    }

    // Strategy 3: Wikibooks-style - look for mw-parser-output links
    if (nodes.length < 5) {
      $('.mw-parser-output > ul a, .mw-parser-output > ol a').each((_, el) => {
        if (nodes.length >= 50) return false;
        const $el = $(el);
        const href = $el.attr('href') || '';
        // Skip edit links and external links
        if (href.includes('action=edit') || href.startsWith('http') && !href.includes('wikibooks')) return;
        addNode(href, $el.text().trim());
      });
    }

    // Strategy 4: Look for heading links
    if (nodes.length < 5) {
      $('h1 a, h2 a, h3 a, h4 a').each((_, el) => {
        if (nodes.length >= 50) return false;
        const $el = $(el);
        const $heading = $el.closest('h1, h2, h3, h4');
        const depth = parseInt($heading.prop('tagName')?.charAt(1) || '2') - 1;
        addNode($el.attr('href') || '', $el.text().trim(), depth);
      });
    }

    console.log(`[WebDocs] Basic extraction found ${nodes.length} nodes`);
    return nodes;
  }

  /**
   * Save TOC nodes to registry
   */
  private async saveTocToRegistry(assetId: string, nodes: TocNode[]): Promise<void> {
    const nodesToInsert = nodes.map(node => ({
      asset_id: assetId,
      slug: node.slug,
      title: node.title,
      url: node.url,
      node_type: node.node_type,
      depth: node.depth,
      sort_order: node.sort_order,
      selector_hints: node.selector_hints,
      metadata: node.metadata,
    }));

    const batchSize = 100;
    for (let i = 0; i < nodesToInsert.length; i += batchSize) {
      const batch = nodesToInsert.slice(i, i + batchSize);
      
      const { error } = await this.supabase
        .from('source_registry_nodes')
        .insert(batch);

      if (error) {
        logger.error('web-docs', `Failed to save TOC: ${error.message}`);
        throw error;
      }
    }

    console.log(`[WebDocs] ✓ Saved ${nodes.length} TOC nodes to database`);
    logger.info('web-docs', `Saved ${nodes.length} TOC nodes`);
  }

  /**
   * Get TOC summaries for AI consumption
   */
  async getTocSummaries(assetId: string): Promise<TocNodeSummary[]> {
    const { data: dbNodes } = await this.supabase
      .from('source_registry_nodes')
      .select('id, title, sort_order, depth, node_type')
      .eq('asset_id', assetId)
      .order('sort_order');

    return (dbNodes || []).map(node => ({
      node_id: node.id,
      title: node.title,
      order: node.sort_order,
      depth: node.depth,
      node_type: node.node_type,
    }));
  }

  /**
   * Full discovery flow: Find best doc source and get TOC
   * Tries multiple matching sources if TOC extraction fails for one
   */
  async discoverDocsForTopic(topic: string): Promise<{
    asset: Asset;
    tocSummaries: TocNodeSummary[];
    source: DocSource;
  } | null> {
    logger.info('web-docs', `Discovering docs for: "${topic}"`);
    console.log(`[WebDocs] 🔍 Searching for documentation on: "${topic}"`);

    // Get ALL matching curated sources, sorted by score
    const matchingDocs = this.searchKnownDocs(topic);
    const viableDocs = matchingDocs.filter(m => m.score >= 10);
    
    console.log(`[WebDocs] Found ${viableDocs.length} potential sources`);

    // Try each matching source until one works
    for (const match of viableDocs) {
      const docSource = match.source;
      console.log(`[WebDocs] Trying: ${docSource.name} (score: ${match.score})`);
      
      try {
        const asset = await this.getOrCreateDocAsset(docSource);
        await this.getTocForDocAsset(asset, docSource);
        const tocSummaries = await this.getTocSummaries(asset.id);

        if (tocSummaries.length > 0) {
          console.log(`[WebDocs] ✓ Success! Loaded ${tocSummaries.length} sections from ${docSource.name}`);
          return { asset, tocSummaries, source: docSource };
        } else {
          console.log(`[WebDocs] ⚠️ No TOC extracted from ${docSource.name}, trying next...`);
        }
      } catch (error) {
        console.log(`[WebDocs] ⚠️ Error with ${docSource.name}: ${(error as Error).message}`);
        logger.error('web-docs', `Error fetching ${docSource.name}: ${(error as Error).message}`);
      }
    }

    // If no curated source worked, try web search
    console.log(`[WebDocs] No curated source worked. Trying web search...`);
    const webResults = await this.searchWeb(topic);
    
    // Look for documentation sites in results
    const docDomains = ['docs.', 'developer.', 'learn.', 'tutorial', 'guide'];
    const docResult = webResults.find(r => 
      docDomains.some(d => r.domain.includes(d) || r.url.includes(d))
    );

    if (docResult) {
      console.log(`[WebDocs] Found web documentation: ${docResult.title}`);
      logger.info('web-docs', `Found web doc: ${docResult.url}`);
    }

    return null;
  }

  /**
   * Tokenize query string
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  /**
   * Create URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  /**
   * Calculate match score between doc source and query
   * 
   * IMPORTANT: Uses EXACT keyword matching to avoid false positives
   * like "java" matching "javascript" - they are different languages!
   */
  private calculateDocMatch(source: DocSource, queryTerms: string[]): DocMatchResult {
    const matchedKeywords: string[] = [];
    let score = 0;

    // Commonly confused terms that should NOT match each other
    const confusedPairs: Record<string, string[]> = {
      'java': ['javascript', 'js'],
      'javascript': ['java'],
      'js': ['java'],
      'c': ['cpp', 'csharp', 'c++', 'c#'],
      'cpp': ['c', 'csharp'],
      'csharp': ['c', 'cpp'],
    };

    for (const term of queryTerms) {
      // Check if this term conflicts with the source's keywords
      const conflictingTerms = confusedPairs[term] || [];
      const hasConflict = source.keywords.some(kw => conflictingTerms.includes(kw));
      
      if (hasConflict) {
        // Skip this source - it's a different technology with similar name
        logger.debug('web-docs', `Skipping "${source.name}" - term "${term}" conflicts with keywords`);
        return { source, score: 0, matchedKeywords: [] };
      }

      // Direct EXACT keyword match (highest weight)
      if (source.keywords.includes(term)) {
        score += 15;
        matchedKeywords.push(term);
        continue;
      }

      // Exact word match in name (not substring!)
      const nameWords = this.tokenize(source.name);
      if (nameWords.includes(term)) {
        score += 10;
        matchedKeywords.push(term);
        continue;
      }

      // Match in description (medium weight) - exact word only
      const descWords = this.tokenize(source.description);
      if (descWords.includes(term)) {
        score += 5;
        matchedKeywords.push(term);
      }
    }

    // Bonus for multiple keyword matches
    if (matchedKeywords.length > 1) {
      score += matchedKeywords.length * 3;
    }

    return { source, score, matchedKeywords };
  }
}

