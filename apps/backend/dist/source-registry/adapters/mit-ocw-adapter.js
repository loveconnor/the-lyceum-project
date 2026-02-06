"use strict";
/**
 * MIT OpenCourseWare Adapter
 * Discovers and maps MIT OpenCourseWare courses
 *
 * MIT OCW provides free and open educational resources from MIT courses.
 * All content is licensed under Creative Commons.
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
exports.mitOcwAdapter = exports.MitOcwAdapter = void 0;
const cheerio = __importStar(require("cheerio"));
const base_adapter_1 = require("./base-adapter");
const fetcher_1 = require("../fetcher");
class MitOcwAdapter extends base_adapter_1.BaseAdapter {
    constructor() {
        super(...arguments);
        this.sourceType = 'mit_ocw';
        this.ocwBaseUrl = 'https://ocw.mit.edu';
        // Curated list of popular MIT OCW courses
        // Since MIT OCW doesn't have a simple public API, we maintain a list of high-quality courses
        this.curatedCourses = [
            {
                courseNumber: '6.0001',
                title: 'Introduction to Computer Science and Programming in Python',
                url: 'https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/',
                department: 'Electrical Engineering and Computer Science',
                topics: ['python', 'programming', 'computer science', 'algorithms', 'data structures'],
                level: 'Undergraduate',
            },
            {
                courseNumber: '6.092',
                title: 'Introduction to Programming in Java',
                url: 'https://ocw.mit.edu/courses/6-092-introduction-to-programming-in-java-january-iap-2010/',
                department: 'Electrical Engineering and Computer Science',
                topics: ['java', 'programming', 'oop', 'object-oriented'],
                level: 'Undergraduate',
            },
            {
                courseNumber: '6.006',
                title: 'Introduction to Algorithms',
                url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/',
                department: 'Electrical Engineering and Computer Science',
                topics: ['algorithms', 'data structures', 'computer science', 'complexity'],
                level: 'Undergraduate',
            },
            {
                courseNumber: '18.01',
                title: 'Single Variable Calculus',
                url: 'https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/',
                department: 'Mathematics',
                topics: ['calculus', 'mathematics', 'derivatives', 'integrals'],
                level: 'Undergraduate',
            },
            {
                courseNumber: '18.02',
                title: 'Multivariable Calculus',
                url: 'https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/',
                department: 'Mathematics',
                topics: ['calculus', 'mathematics', 'vectors', 'multivariable'],
                level: 'Undergraduate',
            },
            {
                courseNumber: '18.06',
                title: 'Linear Algebra',
                url: 'https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/',
                department: 'Mathematics',
                topics: ['linear algebra', 'mathematics', 'matrices', 'vectors'],
                level: 'Undergraduate',
            },
            {
                courseNumber: '6.046J',
                title: 'Design and Analysis of Algorithms',
                url: 'https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/',
                department: 'Electrical Engineering and Computer Science',
                topics: ['algorithms', 'analysis', 'design', 'complexity'],
                level: 'Graduate',
            },
            {
                courseNumber: '6.042J',
                title: 'Mathematics for Computer Science',
                url: 'https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/',
                department: 'Electrical Engineering and Computer Science',
                topics: ['discrete mathematics', 'logic', 'proofs', 'computer science'],
                level: 'Undergraduate',
            },
            {
                courseNumber: '14.01',
                title: 'Principles of Microeconomics',
                url: 'https://ocw.mit.edu/courses/14-01sc-principles-of-microeconomics-fall-2011/',
                department: 'Economics',
                topics: ['economics', 'microeconomics', 'markets', 'supply', 'demand'],
                level: 'Undergraduate',
            },
            {
                courseNumber: '8.01',
                title: 'Physics I: Classical Mechanics',
                url: 'https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/',
                department: 'Physics',
                topics: ['physics', 'mechanics', 'motion', 'forces', 'energy'],
                level: 'Undergraduate',
            },
        ];
    }
    /**
     * Discover MIT OCW courses from curated list
     */
    async discoverAssets(seedUrl, config) {
        this.log('info', 'discover', `Discovering MIT OCW courses from curated list`);
        const assets = this.curatedCourses.map(course => {
            const slug = course.courseNumber.toLowerCase().replace(/\./g, '-');
            return {
                slug,
                title: course.title,
                url: course.url,
                description: `MIT OpenCourseWare - ${course.courseNumber}: ${course.title}`,
                metadata: {
                    courseNumber: course.courseNumber,
                    department: course.department,
                    level: course.level,
                    topics: course.topics,
                },
            };
        });
        this.log('info', 'discover', `Discovered ${assets.length} MIT OCW courses`);
        return assets;
    }
    /**
     * Strip HTML tags from text
     */
    stripHtml(html) {
        if (!html)
            return '';
        return html.replace(/<[^>]*>/g, '').trim();
    }
    /**
     * Validate an MIT OCW course
     * MIT OCW content is generally CC licensed
     */
    async validate(asset, baseUrl) {
        const baseResult = await super.validate(asset, baseUrl);
        // MIT OCW is known to use Creative Commons licenses
        // Most content is CC BY-NC-SA 4.0, but this can vary
        if (!baseResult.license_name || baseResult.license_confidence < 0.7) {
            baseResult.license_name = 'CC BY-NC-SA 4.0';
            baseResult.license_url = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
            baseResult.license_confidence = 0.85;
        }
        return baseResult;
    }
    /**
     * Map the TOC of an MIT OCW course
     * Extracts from the course page structure and expands index pages to individual lectures
     */
    async mapToc(asset, baseUrl) {
        this.log('info', 'map-toc', `Mapping TOC for ${asset.title}`);
        const result = await fetcher_1.fetcher.fetch(asset.url);
        if (!result.ok || !result.html) {
            this.log('error', 'map-toc', `Failed to fetch course page: ${result.error}`);
            return [];
        }
        const $ = cheerio.load(result.html);
        const nodes = [];
        let sortOrder = 0;
        // MIT OCW courses typically have sections in the navigation or main content
        // Look for common course structure patterns
        // Try to find navigation menu first
        const navSelectors = [
            'nav[aria-label="Course materials"]',
            '.course-nav',
            '.course-sidebar nav',
            '#course-nav',
            '.left-nav',
            'aside nav',
        ];
        let $nav = null;
        for (const selector of navSelectors) {
            const found = $(selector);
            if (found.length > 0) {
                $nav = found;
                break;
            }
        }
        if ($nav && $nav.length > 0) {
            // Parse navigation structure
            this.log('debug', 'map-toc', 'Found navigation menu');
            const parseNavItems = async ($items, depth) => {
                const levelNodes = [];
                for (let i = 0; i < $items.length; i++) {
                    const elem = $items[i];
                    const $item = $(elem);
                    const $link = $item.find('a').first();
                    if ($link.length === 0)
                        continue;
                    const title = $link.text().trim();
                    if (!title)
                        continue;
                    let url = $link.attr('href') || '';
                    if (url && !url.startsWith('http')) {
                        url = url.startsWith('/') ? `${this.ocwBaseUrl}${url}` : `${asset.url}/${url}`;
                    }
                    // Determine node type based on depth and title
                    const nodeType = this.determineNodeType(title, depth);
                    const node = {
                        slug: this.slugify(`${asset.slug}-${title}-${sortOrder}`),
                        title,
                        url: url || asset.url,
                        node_type: nodeType,
                        depth,
                        sort_order: sortOrder++,
                        metadata: {},
                    };
                    // Look for child items
                    const $children = $item.find('ul, ol').first().children('li');
                    if ($children.length > 0) {
                        node.children = await parseNavItems($children, depth + 1);
                    }
                    levelNodes.push(node);
                }
                return levelNodes;
            };
            const $topItems = $nav.find('> ul, > ol').first().children('li');
            const treeNodes = await parseNavItems($topItems, 0);
            const flatNodes = this.flattenToc(treeNodes);
            // For MIT OCW, expand index pages (like "Lecture Notes") to individual lectures
            this.log('debug', 'map-toc', `Expanding index pages for ${flatNodes.length} nodes...`);
            const expandedNodes = [];
            for (const node of flatNodes) {
                // Check if this is an index page that should be expanded
                if (this.shouldExpandNode(node)) {
                    this.log('debug', 'map-toc', `Expanding: ${node.title}`);
                    const childNodes = await this.expandIndexPage(node, asset.slug);
                    if (childNodes.length > 0) {
                        expandedNodes.push(...childNodes);
                        sortOrder += childNodes.length;
                    }
                    else {
                        // If expansion failed, keep the original node
                        expandedNodes.push(node);
                    }
                }
                else {
                    expandedNodes.push(node);
                }
            }
            nodes.push(...expandedNodes);
        }
        else {
            // Fallback: try to extract from main content headings or sections
            this.log('debug', 'map-toc', 'No nav found, attempting to extract from page structure');
            // Look for course sections in the main content
            const $sections = $('.course-section, .course-page, section[data-course-section]');
            if ($sections.length > 0) {
                $sections.each((i, elem) => {
                    const $section = $(elem);
                    const title = $section.find('h1, h2, h3').first().text().trim() || `Section ${i + 1}`;
                    const url = asset.url; // Sections might not have separate URLs
                    nodes.push({
                        slug: this.slugify(`${asset.slug}-${title}-${sortOrder}`),
                        title,
                        url,
                        node_type: 'section',
                        depth: 0,
                        sort_order: sortOrder++,
                        metadata: {},
                    });
                });
            }
            else {
                // Last resort: create a single node for the course page itself
                this.log('debug', 'map-toc', 'No structured content found, creating single root node');
                nodes.push({
                    slug: asset.slug,
                    title: asset.title,
                    url: asset.url,
                    node_type: 'page',
                    depth: 0,
                    sort_order: 0,
                    metadata: {},
                });
            }
        }
        this.log('info', 'map-toc', `Mapped ${nodes.length} TOC nodes for ${asset.title}`);
        return nodes;
    }
    /**
     * Check if a node is an index page that should be expanded to individual items
     */
    shouldExpandNode(node) {
        const title = node.title.toLowerCase();
        return (title.includes('lecture') ||
            title.includes('assignment') ||
            title.includes('reading')) && node.url.includes('/pages/');
    }
    /**
     * Expand an index page (like /pages/lecture-notes/) to individual lecture nodes
     */
    async expandIndexPage(indexNode, assetSlug) {
        const result = await fetcher_1.fetcher.fetch(indexNode.url);
        if (!result.ok || !result.html) {
            this.log('warn', 'map-toc', `Failed to fetch index page: ${indexNode.url}`);
            return [];
        }
        const $ = cheerio.load(result.html);
        const childNodes = [];
        let childOrder = 0;
        // Look for table rows with lecture/assignment listings
        // MIT OCW often uses tables with columns like: Lecture # | Topics | Files
        $('table tr').each((i, row) => {
            if (i === 0)
                return; // Skip header row
            const $row = $(row);
            const cells = $row.find('td');
            if (cells.length < 2)
                return;
            // Try to extract title from first or second column
            let title = cells.eq(0).text().trim();
            const topicTitle = cells.eq(1).text().trim();
            if (topicTitle && topicTitle.length > title.length) {
                title = topicTitle;
            }
            if (!title)
                return;
            // Look for PDF or page links in the row
            const $links = $row.find('a[href]');
            let contentUrl = indexNode.url;
            // Prefer PDF links, fallback to page links
            $links.each((_, link) => {
                const href = $(link).attr('href') || '';
                if (href.endsWith('.pdf') || href.includes('/resources/')) {
                    contentUrl = href.startsWith('http') ? href :
                        href.startsWith('/') ? `${this.ocwBaseUrl}${href}` :
                            `${indexNode.url.replace(/\/[^/]*$/, '')}/${href}`;
                }
            });
            childNodes.push({
                slug: this.slugify(`${assetSlug}-${title}-${childOrder}`),
                title: `${indexNode.title}: ${title}`,
                url: contentUrl,
                node_type: 'section',
                depth: indexNode.depth + 1,
                sort_order: indexNode.sort_order + childOrder,
                metadata: {
                    parent_title: indexNode.title,
                    is_pdf: contentUrl.endsWith('.pdf'),
                },
            });
            childOrder++;
        });
        this.log('debug', 'map-toc', `Expanded "${indexNode.title}" into ${childNodes.length} child nodes`);
        return childNodes;
    }
    /**
     * Determine node type based on title and depth
     */
    determineNodeType(title, depth) {
        const lowerTitle = title.toLowerCase();
        // Common MIT OCW section names
        if (lowerTitle.includes('syllabus') || lowerTitle.includes('calendar')) {
            return 'section';
        }
        if (lowerTitle.includes('lecture') || lowerTitle.match(/^lecture\s+\d+/i)) {
            return 'section';
        }
        if (lowerTitle.includes('assignment') || lowerTitle.includes('problem set') || lowerTitle.includes('pset')) {
            return 'section';
        }
        if (lowerTitle.includes('reading') || lowerTitle.includes('readings')) {
            return 'section';
        }
        if (lowerTitle.includes('exam') || lowerTitle.includes('quiz')) {
            return 'section';
        }
        if (lowerTitle.includes('project')) {
            return 'section';
        }
        // Based on depth
        if (depth === 0) {
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
     * Get selector hints for MIT OCW content extraction
     */
    getSelectorHints() {
        return {
            content: '.course-content, main, article, .main-content, #content',
            title: 'h1, .course-title, .page-title',
            toc: 'nav, .course-nav, .left-nav, aside',
            license: '.license, .cc-license, footer .license',
        };
    }
}
exports.MitOcwAdapter = MitOcwAdapter;
exports.mitOcwAdapter = new MitOcwAdapter();
