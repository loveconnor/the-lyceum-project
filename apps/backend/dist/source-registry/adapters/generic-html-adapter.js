"use strict";
/**
 * Generic HTML TOC Adapter
 * A minimal adapter for extracting TOC from arbitrary HTML documentation
 *
 * This adapter is designed for flexibility and can be configured
 * with custom selectors for different documentation sites.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.genericHtmlAdapter = exports.GenericHtmlTocAdapter = void 0;
const cheerio = __importStar(require("cheerio"));
const base_adapter_1 = require("./base-adapter");
const fetcher_1 = require("../fetcher");
const DEFAULT_CONFIG = {
    tocSelector: 'nav, .toc, #toc, .table-of-contents, aside',
    tocItemSelector: 'li',
    tocLinkSelector: 'a',
    contentSelector: 'main, article, .content, #content, .main-content',
    titleSelector: 'h1, .title, [role="heading"]',
    assetLinkSelector: 'a[href]',
    assetTitleSelector: 'h2, h3, .title',
    maxDepth: 5,
    excludePatterns: ['#', 'javascript:', 'mailto:', 'tel:'],
};
class GenericHtmlTocAdapter extends base_adapter_1.BaseAdapter {
    constructor(config) {
        super();
        this.sourceType = 'generic_html';
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Update adapter configuration
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Discover assets from a page (links to documentation pages)
     */
    async discoverAssets(seedUrl, config) {
        this.log('info', 'discover', `Discovering assets from ${seedUrl}`);
        const mergedConfig = { ...this.config, ...config };
        const assets = [];
        const seenUrls = new Set();
        // Validate domain
        const seedDomain = new URL(seedUrl).hostname;
        if (mergedConfig.allowedDomains && mergedConfig.allowedDomains.length > 0) {
            if (!mergedConfig.allowedDomains.some(d => seedDomain.includes(d))) {
                this.log('warn', 'discover', `Domain ${seedDomain} not in allowed domains`);
                return [];
            }
        }
        const result = await fetcher_1.fetcher.fetch(seedUrl);
        if (!result.ok || !result.html) {
            this.log('error', 'discover', `Failed to fetch seed URL: ${result.error}`);
            return [];
        }
        const $ = cheerio.load(result.html);
        // Extract page title for single-asset mode
        const pageTitle = $(mergedConfig.titleSelector).first().text().trim() ||
            $('title').text().trim() ||
            'Documentation';
        // Look for documentation sections or pages
        const linkSelector = mergedConfig.assetLinkSelector || 'a[href]';
        $(linkSelector).each((_, el) => {
            const $link = $(el);
            const href = $link.attr('href');
            if (!href)
                return;
            // Skip excluded patterns
            if (mergedConfig.excludePatterns?.some(p => href.includes(p)))
                return;
            // Resolve and validate URL
            let url;
            try {
                url = this.resolveUrl(href, seedUrl);
                const urlObj = new URL(url);
                // Only allow same domain or explicitly allowed domains
                if (urlObj.hostname !== seedDomain) {
                    if (!mergedConfig.allowedDomains?.some(d => urlObj.hostname.includes(d))) {
                        return;
                    }
                }
            }
            catch {
                return;
            }
            // Skip duplicates
            if (seenUrls.has(url))
                return;
            seenUrls.add(url);
            const title = $link.text().trim() ||
                $link.attr('title') ||
                this.slugify(new URL(url).pathname).replace(/-/g, ' ');
            if (!title || title.length < 2)
                return;
            assets.push({
                slug: this.slugify(title),
                title,
                url,
                description: $link.attr('title') || undefined,
            });
        });
        // If no assets found, treat the seed URL as a single asset
        if (assets.length === 0) {
            assets.push({
                slug: this.slugify(pageTitle),
                title: pageTitle,
                url: seedUrl,
            });
        }
        this.log('info', 'discover', `Discovered ${assets.length} assets`);
        return assets;
    }
    /**
     * Map the TOC structure from an HTML page
     */
    async mapToc(asset, baseUrl) {
        this.log('info', 'map-toc', `Mapping TOC for ${asset.title}`);
        const result = await fetcher_1.fetcher.fetch(asset.url);
        if (!result.ok || !result.html) {
            this.log('error', 'map-toc', `Failed to fetch asset: ${result.error}`);
            return [];
        }
        const $ = cheerio.load(result.html);
        const nodes = [];
        // Try multiple strategies to find TOC
        let tocNodes = this.extractFromTocContainer($, asset, baseUrl);
        if (tocNodes.length === 0) {
            tocNodes = this.extractFromHeadings($, asset, baseUrl);
        }
        if (tocNodes.length === 0) {
            tocNodes = this.extractFromLinks($, asset, baseUrl);
        }
        nodes.push(...this.flattenToc(tocNodes));
        this.log('info', 'map-toc', `Mapped ${nodes.length} TOC nodes`);
        return nodes;
    }
    /**
     * Extract TOC from a dedicated TOC container
     */
    extractFromTocContainer($, asset, baseUrl) {
        const tocSelectors = this.config.tocSelector.split(',').map(s => s.trim());
        for (const selector of tocSelectors) {
            const $toc = $(selector);
            if ($toc.length === 0)
                continue;
            // Find the list within the TOC container
            const $list = $toc.find('ul, ol').first();
            if ($list.length === 0)
                continue;
            const nodes = this.parseList($, $list, asset.slug, baseUrl, 0);
            if (nodes.length > 0) {
                return nodes;
            }
        }
        return [];
    }
    /**
     * Parse a nested list structure into TOC nodes
     */
    parseList($, $list, assetSlug, baseUrl, depth) {
        if (depth > (this.config.maxDepth || 5))
            return [];
        const nodes = [];
        let sortOrder = 0;
        $list.children(this.config.tocItemSelector).each((_, li) => {
            const $li = $(li);
            const $link = $li.children(this.config.tocLinkSelector).first();
            if ($link.length === 0)
                return;
            const href = $link.attr('href');
            const title = $link.text().trim();
            if (!title)
                return;
            let url = baseUrl;
            if (href && !this.config.excludePatterns?.some(p => href.includes(p))) {
                url = this.resolveUrl(href, baseUrl);
            }
            const slug = `${assetSlug}-${this.slugify(title)}-${depth}-${sortOrder}`;
            const node = {
                slug,
                title,
                url,
                node_type: this.getNodeType(depth),
                depth,
                sort_order: sortOrder++,
            };
            // Parse nested list
            const $nestedList = $li.children('ul, ol');
            if ($nestedList.length > 0) {
                node.children = this.parseList($, $nestedList, assetSlug, baseUrl, depth + 1);
            }
            nodes.push(node);
        });
        return nodes;
    }
    /**
     * Extract TOC from heading structure
     */
    extractFromHeadings($, asset, baseUrl) {
        const nodes = [];
        let sortOrder = 0;
        // Get content area
        const contentSelector = this.config.contentSelector;
        const $content = $(contentSelector).first();
        const $searchArea = $content.length > 0 ? $content : $('body');
        // Find all headings with IDs
        $searchArea.find('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').each((_, el) => {
            const $heading = $(el);
            const id = $heading.attr('id');
            const title = $heading.text().trim();
            const tagName = el.tagName.toLowerCase();
            if (!id || !title)
                return;
            // Determine depth from heading level
            const level = parseInt(tagName.charAt(1), 10) - 1;
            const depth = Math.max(0, level - 1); // h2 = depth 0, h3 = depth 1, etc.
            nodes.push({
                slug: `${asset.slug}-${id}`,
                title,
                url: `${baseUrl}#${id}`,
                node_type: this.getNodeType(depth),
                depth,
                sort_order: sortOrder++,
            });
        });
        return nodes;
    }
    /**
     * Extract TOC from links in the page
     */
    extractFromLinks($, asset, baseUrl) {
        const nodes = [];
        let sortOrder = 0;
        const seenUrls = new Set();
        // Look for navigation-style links
        const navSelectors = ['nav a', '.navigation a', '.sidebar a', 'aside a'];
        for (const selector of navSelectors) {
            $(selector).each((_, el) => {
                const $link = $(el);
                const href = $link.attr('href');
                const title = $link.text().trim();
                if (!href || !title)
                    return;
                if (this.config.excludePatterns?.some(p => href.includes(p)))
                    return;
                const url = this.resolveUrl(href, baseUrl);
                if (seenUrls.has(url))
                    return;
                seenUrls.add(url);
                nodes.push({
                    slug: `${asset.slug}-${this.slugify(title)}-${sortOrder}`,
                    title,
                    url,
                    node_type: 'section',
                    depth: 0,
                    sort_order: sortOrder++,
                });
            });
            if (nodes.length > 0)
                break;
        }
        return nodes;
    }
    /**
     * Get node type based on depth
     */
    getNodeType(depth) {
        switch (depth) {
            case 0:
                return 'chapter';
            case 1:
                return 'section';
            case 2:
                return 'subsection';
            default:
                return 'other';
        }
    }
    /**
     * Get selector hints for content extraction
     */
    getSelectorHints() {
        return {
            content: this.config.contentSelector,
            title: this.config.titleSelector,
            toc: this.config.tocSelector,
        };
    }
}
exports.GenericHtmlTocAdapter = GenericHtmlTocAdapter;
exports.genericHtmlAdapter = new GenericHtmlTocAdapter();
