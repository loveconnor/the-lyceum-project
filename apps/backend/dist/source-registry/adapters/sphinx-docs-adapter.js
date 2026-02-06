"use strict";
/**
 * Sphinx Docs Adapter
 * Discovers and maps documentation built with Sphinx (like Python docs)
 *
 * Sphinx is a documentation generator commonly used for Python projects.
 * Python docs (docs.python.org) use a modified Sphinx setup.
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
exports.sphinxDocsAdapter = exports.SphinxDocsAdapter = void 0;
const cheerio = __importStar(require("cheerio"));
const base_adapter_1 = require("./base-adapter");
const fetcher_1 = require("../fetcher");
class SphinxDocsAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.sourceType = 'sphinx_docs';
        this.defaultConfig = {
            versions: ['3.13', '3.12', '3.11', '3.10'],
            languages: ['en'],
            defaultVersion: '3.12',
            defaultLanguage: 'en',
        };
    }
    /**
     * Discover Python doc versions/sections
     */
    async discoverAssets(seedUrl, config) {
        this.log('info', 'discover', `Discovering Sphinx docs from ${seedUrl}`);
        const sphinxConfig = {
            ...this.defaultConfig,
            ...config,
        };
        const assets = [];
        // For Python docs specifically
        if (seedUrl.includes('docs.python.org')) {
            return this.discoverPythonDocs(seedUrl, sphinxConfig);
        }
        // Generic Sphinx discovery
        try {
            const result = await fetcher_1.fetcher.fetch(seedUrl);
            if (!result.ok || !result.html) {
                this.log('error', 'discover', `Failed to fetch Sphinx index: ${result.error}`);
                return [];
            }
            const $ = cheerio.load(result.html);
            // Look for version selector or documentation sections
            const versionLinks = $('select[name="version"] option, a[href*="/version/"], .version-selector a');
            if (versionLinks.length > 0) {
                versionLinks.each((_, el) => {
                    const $el = $(el);
                    const version = $el.attr('value') || $el.text().trim();
                    const href = $el.attr('href') || `${seedUrl}${version}/`;
                    if (version && !version.includes('latest')) {
                        assets.push({
                            slug: `docs-v${this.slugify(version)}`,
                            title: `Documentation v${version}`,
                            url: this.resolveUrl(href, seedUrl),
                            version,
                        });
                    }
                });
            }
            else {
                // Single version documentation
                assets.push({
                    slug: 'docs',
                    title: $('title').text().trim() || 'Documentation',
                    url: seedUrl,
                });
            }
        }
        catch (err) {
            this.log('error', 'discover', `Discovery failed: ${err.message}`);
        }
        this.log('info', 'discover', `Discovered ${assets.length} Sphinx doc assets`);
        return assets;
    }
    /**
     * Discover Python documentation specifically
     */
    async discoverPythonDocs(seedUrl, config) {
        const assets = [];
        const versions = config.versions || this.defaultConfig.versions;
        const language = config.defaultLanguage || 'en';
        // Python docs have a specific URL structure: docs.python.org/{version}/
        for (const version of versions) {
            const versionUrl = `https://docs.python.org/${version}/`;
            // Check if version exists
            try {
                const result = await fetcher_1.fetcher.fetch(versionUrl, { retries: 1 });
                if (result.ok) {
                    assets.push({
                        slug: `python-${version}`,
                        title: `Python ${version} Documentation`,
                        url: versionUrl,
                        version,
                        description: `Official Python ${version} documentation`,
                        metadata: {
                            language,
                            sections: ['tutorial', 'library', 'reference', 'howto', 'faq'],
                        },
                    });
                    this.log('debug', 'discover', `Found Python ${version} docs`);
                }
                else {
                    this.log('debug', 'discover', `Python ${version} docs not available`);
                }
            }
            catch (err) {
                this.log('warn', 'discover', `Error checking Python ${version}: ${err.message}`);
            }
        }
        return assets;
    }
    /**
     * Validate Sphinx documentation
     */
    async validate(asset, baseUrl) {
        const baseResult = await super.validate(asset, baseUrl);
        // Python docs are PSF licensed (similar to BSD)
        if (asset.url.includes('docs.python.org')) {
            if (!baseResult.license_name || baseResult.license_confidence < 0.9) {
                baseResult.license_name = 'PSF License';
                baseResult.license_url = 'https://docs.python.org/3/license.html';
                baseResult.license_confidence = 0.95;
            }
        }
        return baseResult;
    }
    /**
     * Map the TOC of a Sphinx documentation site
     */
    async mapToc(asset, baseUrl) {
        this.log('info', 'map-toc', `Mapping TOC for ${asset.title}`);
        // For Python docs, use the genindex or main toctree
        if (asset.url.includes('docs.python.org')) {
            return this.mapPythonDocsToc(asset, baseUrl);
        }
        return this.mapGenericSphinxToc(asset, baseUrl);
    }
    /**
     * Map Python documentation TOC
     */
    async mapPythonDocsToc(asset, baseUrl) {
        const nodes = [];
        let sortOrder = 0;
        // Fetch the main page to get the top-level TOC
        const result = await fetcher_1.fetcher.fetch(asset.url);
        if (!result.ok || !result.html) {
            this.log('error', 'map-toc', `Failed to fetch Python docs: ${result.error}`);
            return [];
        }
        const $ = cheerio.load(result.html);
        // Python docs have main sections: Tutorial, Library Reference, Language Reference, etc.
        // These are typically in a toctree or sidebar
        const tocSelectors = [
            '.toctree-wrapper',
            '.sidebar-toctree',
            '#documentation nav',
            '.sphinxsidebar',
            'nav.sphinxsidebarwrapper',
        ];
        let $toc = null;
        for (const selector of tocSelectors) {
            const found = $(selector);
            if (found.length > 0) {
                $toc = found.first();
                break;
            }
        }
        // Parse top-level sections from main page links
        const mainSections = [
            { name: 'Tutorial', slug: 'tutorial', path: 'tutorial/index.html' },
            { name: 'Library Reference', slug: 'library', path: 'library/index.html' },
            { name: 'Language Reference', slug: 'reference', path: 'reference/index.html' },
            { name: 'Python Setup and Usage', slug: 'using', path: 'using/index.html' },
            { name: 'HOWTOs', slug: 'howto', path: 'howto/index.html' },
            { name: 'Installing Python Modules', slug: 'installing', path: 'installing/index.html' },
            { name: 'Distributing Python Modules', slug: 'distributing', path: 'distributing/index.html' },
            { name: 'FAQs', slug: 'faq', path: 'faq/index.html' },
        ];
        for (const section of mainSections) {
            const sectionUrl = this.resolveUrl(section.path, asset.url);
            nodes.push({
                slug: `${asset.slug}-${section.slug}`,
                title: section.name,
                url: sectionUrl,
                node_type: 'chapter',
                depth: 0,
                sort_order: sortOrder++,
            });
            // Try to get subsections for each main section
            try {
                const sectionResult = await fetcher_1.fetcher.fetch(sectionUrl);
                if (sectionResult.ok && sectionResult.html) {
                    const $section = cheerio.load(sectionResult.html);
                    const subNodes = this.parseSphinxToctree($section, sectionUrl, asset.slug, section.slug, 1, sortOrder);
                    sortOrder = subNodes.nextOrder;
                    nodes.push(...subNodes.nodes);
                }
            }
            catch (err) {
                this.log('debug', 'map-toc', `Could not fetch section ${section.name}: ${err.message}`);
            }
        }
        this.log('info', 'map-toc', `Mapped ${nodes.length} TOC nodes for Python docs`);
        return nodes;
    }
    /**
     * Parse Sphinx toctree from a page
     */
    parseSphinxToctree($, pageUrl, assetSlug, parentSlug, depth, startOrder) {
        const nodes = [];
        let sortOrder = startOrder;
        // Sphinx uses .toctree-l{n} classes for TOC levels
        const tocTree = $(`.toctree-l${depth}, .toctree-wrapper li`);
        tocTree.each((_, li) => {
            const $li = $(li);
            const $link = $li.children('a').first();
            if ($link.length === 0)
                return;
            const href = $link.attr('href');
            const title = $link.text().trim();
            if (!href || !title)
                return;
            // Skip external links
            if (href.startsWith('http') && !href.includes('python.org'))
                return;
            const url = this.resolveUrl(href, pageUrl);
            const slug = `${assetSlug}-${parentSlug}-${this.slugify(title)}-${sortOrder}`;
            nodes.push({
                slug,
                title,
                url,
                node_type: depth === 1 ? 'section' : 'subsection',
                depth,
                sort_order: sortOrder++,
            });
        });
        // Also check for compound toctree entries
        $('.compound .toctree-l1 > a').each((_, el) => {
            const $link = $(el);
            const href = $link.attr('href');
            const title = $link.text().trim();
            if (!href || !title)
                return;
            if (nodes.some(n => n.title === title))
                return; // Skip duplicates
            const url = this.resolveUrl(href, pageUrl);
            const slug = `${assetSlug}-${parentSlug}-${this.slugify(title)}-${sortOrder}`;
            nodes.push({
                slug,
                title,
                url,
                node_type: 'section',
                depth,
                sort_order: sortOrder++,
            });
        });
        return { nodes, nextOrder: sortOrder };
    }
    /**
     * Map generic Sphinx documentation TOC
     */
    async mapGenericSphinxToc(asset, baseUrl) {
        const nodes = [];
        let sortOrder = 0;
        const result = await fetcher_1.fetcher.fetch(asset.url);
        if (!result.ok || !result.html) {
            return [];
        }
        const $ = cheerio.load(result.html);
        // Try multiple TOC selectors
        const selectors = [
            '.toctree-wrapper ul',
            '.sidebar-toctree ul',
            '#table-of-contents ul',
            '.toc ul',
            'nav.contents ul',
        ];
        let $toc = null;
        for (const selector of selectors) {
            const found = $(selector).first();
            if (found.length > 0 && found.find('a').length > 0) {
                $toc = found;
                break;
            }
        }
        if (!$toc) {
            this.log('warn', 'map-toc', 'Could not find TOC in generic Sphinx docs');
            return [];
        }
        // Parse the TOC tree
        const parseTocTree = ($ul, depth) => {
            const levelNodes = [];
            $ul.children('li').each((_, li) => {
                const $li = $(li);
                const $link = $li.children('a').first();
                if ($link.length === 0)
                    return;
                const href = $link.attr('href');
                const title = $link.text().trim();
                if (!href || !title)
                    return;
                const url = this.resolveUrl(href, asset.url);
                const slug = `${asset.slug}-${this.slugify(title)}-${sortOrder}`;
                const node = {
                    slug,
                    title,
                    url,
                    node_type: this.getNodeTypeForDepth(depth),
                    depth,
                    sort_order: sortOrder++,
                };
                // Check for nested TOC
                const $nestedUl = $li.children('ul');
                if ($nestedUl.length > 0) {
                    node.children = parseTocTree($nestedUl, depth + 1);
                }
                levelNodes.push(node);
            });
            return levelNodes;
        };
        const treeNodes = parseTocTree($toc, 0);
        nodes.push(...this.flattenToc(treeNodes));
        this.log('info', 'map-toc', `Mapped ${nodes.length} TOC nodes`);
        return nodes;
    }
    /**
     * Get node type based on depth
     */
    getNodeTypeForDepth(depth) {
        switch (depth) {
            case 0:
                return 'chapter';
            case 1:
                return 'section';
            default:
                return 'subsection';
        }
    }
    /**
     * Get selector hints for Sphinx content extraction
     */
    getSelectorHints() {
        return {
            content: '.body, .document, [role="main"], main',
            title: 'h1, .title',
            toc: '.toctree-wrapper, .sphinxsidebar, nav.contents',
            license: '.footer, #license',
        };
    }
}
exports.SphinxDocsAdapter = SphinxDocsAdapter;
exports.sphinxDocsAdapter = new SphinxDocsAdapter();
