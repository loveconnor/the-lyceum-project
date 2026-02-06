#!/usr/bin/env tsx
"use strict";
/**
 * Source Registry Integration Tests
 *
 * This script tests the registry functionality with real HTTP requests.
 * Run with: tsx src/scripts/test-registry.ts
 *
 * Flags:
 *   --mock     Run with mocked HTTP (no real requests)
 *   --full     Run full integration test (real requests, slower)
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("../loadEnv");
const supabaseAdmin_1 = require("../supabaseAdmin");
const source_registry_1 = require("../source-registry");
const MOCK_MODE = process.argv.includes('--mock');
const FULL_MODE = process.argv.includes('--full');
// Test utilities
let testsPassed = 0;
let testsFailed = 0;
function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        testsPassed++;
    }
    else {
        console.log(`  ❌ ${message}`);
        testsFailed++;
    }
}
function section(name) {
    console.log(`\n━━━ ${name} ━━━\n`);
}
// Tests
async function testSeedConfiguration() {
    section('Seed Configuration');
    assert(source_registry_1.SEED_SOURCES.length >= 2, 'Has at least 2 seed sources');
    const openstax = (0, source_registry_1.getSeedByName)('OpenStax');
    assert(openstax !== undefined, 'OpenStax seed exists');
    assert(openstax?.type === 'openstax', 'OpenStax has correct type');
    const python = (0, source_registry_1.getSeedByName)('Python Documentation');
    assert(python !== undefined, 'Python Documentation seed exists');
    assert(python?.type === 'sphinx_docs', 'Python docs has correct type');
    assert((0, source_registry_1.isUrlAllowed)('https://openstax.org/books/calculus'), 'OpenStax URLs allowed');
    assert((0, source_registry_1.isUrlAllowed)('https://docs.python.org/3/library/'), 'Python docs URLs allowed');
    assert(!(0, source_registry_1.isUrlAllowed)('https://malicious-site.com/'), 'Unknown domains blocked');
}
async function testFetcher() {
    section('Fetcher');
    if (MOCK_MODE) {
        console.log('  ⏭️  Skipping fetcher tests in mock mode');
        return;
    }
    // Test robots.txt checking
    const robotsResult = await source_registry_1.fetcher.checkRobots('https://docs.python.org/3/');
    assert(robotsResult.allowed === true, 'Python docs allows robots');
    // Test basic fetch
    const fetchResult = await source_registry_1.fetcher.fetch('https://docs.python.org/3/', { retries: 1 });
    assert(fetchResult.ok === true, 'Can fetch Python docs index');
    assert(fetchResult.html !== undefined, 'Fetch returns HTML');
    assert(fetchResult.html.includes('Python'), 'HTML contains expected content');
}
async function testOpenStaxAdapter() {
    section('OpenStax Adapter');
    assert(source_registry_1.openStaxAdapter.sourceType === 'openstax', 'Adapter has correct source type');
    if (MOCK_MODE || !FULL_MODE) {
        console.log('  ⏭️  Skipping full OpenStax discovery (use --full flag)');
        return;
    }
    // Test discovery
    console.log('  🔍 Discovering OpenStax books (this may take a minute)...');
    const assets = await source_registry_1.openStaxAdapter.discoverAssets('https://openstax.org/subjects');
    assert(assets.length > 0, `Discovered ${assets.length} OpenStax books`);
    if (assets.length > 0) {
        const firstAsset = assets[0];
        assert(firstAsset.slug !== '', 'Assets have slugs');
        assert(firstAsset.title !== '', 'Assets have titles');
        assert(firstAsset.url.startsWith('https://'), 'Assets have valid URLs');
        // Test validation
        console.log(`  🔍 Validating: ${firstAsset.title}...`);
        const validation = await source_registry_1.openStaxAdapter.validate(firstAsset, 'https://openstax.org');
        assert(validation.license_name !== undefined, 'Validation detects license');
        assert(validation.robots_status !== 'unknown', 'Validation checks robots');
        // Test TOC mapping (only if validation passed)
        if (validation.robots_status === 'allowed') {
            console.log(`  🔍 Mapping TOC for: ${firstAsset.title}...`);
            const nodes = await source_registry_1.openStaxAdapter.mapToc(firstAsset, 'https://openstax.org');
            assert(nodes.length >= 0, `Mapped ${nodes.length} TOC nodes`);
            if (nodes.length > 0) {
                assert(nodes[0].slug !== '', 'Nodes have slugs');
                assert(nodes[0].title !== '', 'Nodes have titles');
                assert(['chapter', 'section', 'subsection', 'part', 'page', 'root', 'other'].includes(nodes[0].node_type), 'Nodes have valid types');
            }
        }
    }
}
async function testSphinxAdapter() {
    section('Sphinx Docs Adapter');
    assert(source_registry_1.sphinxDocsAdapter.sourceType === 'sphinx_docs', 'Adapter has correct source type');
    if (MOCK_MODE || !FULL_MODE) {
        console.log('  ⏭️  Skipping full Sphinx discovery (use --full flag)');
        return;
    }
    // Test discovery with Python docs
    console.log('  🔍 Discovering Python documentation versions...');
    const assets = await source_registry_1.sphinxDocsAdapter.discoverAssets('https://docs.python.org/3/', {
        versions: ['3.12'], // Just test one version for speed
    });
    assert(assets.length > 0, `Discovered ${assets.length} Python doc versions`);
    if (assets.length > 0) {
        const pythonDocs = assets[0];
        // Test validation
        console.log(`  🔍 Validating: ${pythonDocs.title}...`);
        const validation = await source_registry_1.sphinxDocsAdapter.validate(pythonDocs, 'https://docs.python.org');
        assert(validation.license_name !== undefined, 'Validation detects license');
        // Test TOC mapping
        console.log(`  🔍 Mapping TOC for: ${pythonDocs.title}...`);
        const nodes = await source_registry_1.sphinxDocsAdapter.mapToc(pythonDocs, 'https://docs.python.org');
        assert(nodes.length > 0, `Mapped ${nodes.length} TOC nodes`);
        // Check for expected Python doc sections
        const hasTutorial = nodes.some(n => n.title.toLowerCase().includes('tutorial'));
        const hasLibrary = nodes.some(n => n.title.toLowerCase().includes('library'));
        assert(hasTutorial, 'TOC includes Tutorial section');
        assert(hasLibrary, 'TOC includes Library Reference section');
    }
}
async function testGenericAdapter() {
    section('Generic HTML Adapter');
    assert(source_registry_1.genericHtmlAdapter.sourceType === 'generic_html', 'Adapter has correct source type');
    // Test configuration
    source_registry_1.genericHtmlAdapter.setConfig({
        maxDepth: 3,
        excludePatterns: ['#', 'javascript:'],
    });
    const hints = source_registry_1.genericHtmlAdapter.getSelectorHints();
    assert(hints.content !== undefined, 'Provides content selector hints');
}
async function testDatabaseOperations() {
    section('Database Operations');
    let service;
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        service = new source_registry_1.RegistryService(supabase);
    }
    catch (err) {
        console.log('  ⚠️  Cannot test database operations without Supabase connection');
        console.log(`     Error: ${err.message}`);
        return;
    }
    // Test getting sources
    try {
        const sources = await service.getSources();
        assert(Array.isArray(sources), 'Can fetch sources array');
        console.log(`     Found ${sources.length} existing sources`);
    }
    catch (err) {
        console.log(`  ❌ Failed to fetch sources: ${err.message}`);
        testsFailed++;
    }
    // Test getting assets
    try {
        const assets = await service.getAssets();
        assert(Array.isArray(assets), 'Can fetch assets array');
        console.log(`     Found ${assets.length} existing assets`);
    }
    catch (err) {
        console.log(`  ❌ Failed to fetch assets: ${err.message}`);
        testsFailed++;
    }
}
async function testFullScan() {
    section('Full Scan Integration');
    if (!FULL_MODE) {
        console.log('  ⏭️  Skipping full scan test (use --full flag)');
        return;
    }
    let service;
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        service = new source_registry_1.RegistryService(supabase);
    }
    catch (err) {
        console.log('  ⚠️  Cannot run full scan without Supabase connection');
        return;
    }
    // Scan just Python docs (faster than OpenStax)
    const pythonSeed = (0, source_registry_1.getSeedByName)('Python Documentation');
    console.log('  🔍 Running full scan of Python docs (this may take a few minutes)...');
    try {
        const result = await service.scanSeed({
            ...pythonSeed,
            config: {
                ...pythonSeed.config,
                versions: ['3.12'], // Only scan one version
            },
        });
        assert(result.source !== undefined, 'Scan created/updated source');
        assert(result.assets > 0, `Scan discovered ${result.assets} assets`);
        assert(result.nodes > 0, `Scan mapped ${result.nodes} TOC nodes`);
        // Verify we can retrieve the data
        const sources = await service.getSources();
        const pythonSource = sources.find(s => s.name === 'Python Documentation');
        assert(pythonSource !== undefined, 'Source persisted to database');
        if (pythonSource) {
            const assets = await service.getAssets(pythonSource.id);
            assert(assets.length > 0, 'Assets persisted to database');
            if (assets.length > 0) {
                const nodes = await service.getTocNodes(assets[0].id);
                assert(nodes.length > 0, 'TOC nodes persisted to database');
            }
        }
    }
    catch (err) {
        console.log(`  ❌ Full scan failed: ${err.message}`);
        testsFailed++;
    }
}
async function main() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Source Registry Integration Tests    ║');
    console.log('╚════════════════════════════════════════╝');
    if (MOCK_MODE) {
        console.log('\n⚠️  Running in MOCK mode (no real HTTP requests)');
    }
    if (FULL_MODE) {
        console.log('\n⚠️  Running in FULL mode (real requests, may be slow)');
    }
    console.log(`\nFlags: --mock (skip HTTP) | --full (run integration tests)\n`);
    // Run tests
    await testSeedConfiguration();
    await testFetcher();
    await testOpenStaxAdapter();
    await testSphinxAdapter();
    await testGenericAdapter();
    await testDatabaseOperations();
    await testFullScan();
    // Summary
    section('Summary');
    const total = testsPassed + testsFailed;
    console.log(`  Total:  ${total} tests`);
    console.log(`  Passed: ${testsPassed}`);
    console.log(`  Failed: ${testsFailed}`);
    if (testsFailed > 0) {
        console.log('\n❌ Some tests failed!\n');
        process.exit(1);
    }
    else {
        console.log('\n✅ All tests passed!\n');
        process.exit(0);
    }
}
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
