#!/usr/bin/env tsx
/**
 * Source Registry Scanner CLI
 * Command-line tool for scanning source registry
 * 
 * Usage:
 *   pnpm registry:scan                         # Scan all seeds
 *   pnpm registry:scan:openstax                # Scan OpenStax only
 *   pnpm registry:scan:python                  # Scan Python docs only
 *   tsx src/scripts/scan-registry.ts --seed="OpenStax"
 *   tsx src/scripts/scan-registry.ts --source-id=<uuid>
 *   tsx src/scripts/scan-registry.ts --list-seeds
 *   tsx src/scripts/scan-registry.ts --list-sources
 *   tsx src/scripts/scan-registry.ts --list-assets
 *   tsx src/scripts/scan-registry.ts --export-only
 */

import * as fs from 'fs';
import * as path from 'path';
import '../loadEnv';
import { getSupabaseAdmin } from '../supabaseAdmin';
import { RegistryService, SEED_SOURCES, getSeedByName, logger } from '../source-registry';

interface CliArgs {
  seed?: string;
  sourceId?: string;
  listSeeds?: boolean;
  listSources?: boolean;
  listAssets?: boolean;
  skipScanned?: boolean;
  export?: boolean;
  exportOnly?: boolean;
  outputFile?: string;
  help?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  
  for (const arg of process.argv.slice(2)) {
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--list-seeds') {
      args.listSeeds = true;
    } else if (arg === '--list-sources') {
      args.listSources = true;
    } else if (arg === '--list-assets') {
      args.listAssets = true;
    } else if (arg === '--skip-scanned') {
      args.skipScanned = true;
    } else if (arg === '--export') {
      args.export = true;
    } else if (arg === '--export-only') {
      args.exportOnly = true;
    } else if (arg.startsWith('--output=')) {
      args.outputFile = arg.slice(9);
    } else if (arg.startsWith('--seed=')) {
      args.seed = arg.slice(7);
    } else if (arg.startsWith('--source-id=')) {
      args.sourceId = arg.slice(12);
    }
  }
  
  return args;
}

function printHelp(): void {
  console.log(`
Source Registry Scanner CLI

USAGE:
  pnpm registry:scan [OPTIONS]
  tsx src/scripts/scan-registry.ts [OPTIONS]

OPTIONS:
  --seed=NAME         Scan a specific seed by name
  --source-id=UUID    Scan a specific source by ID
  --skip-scanned      Skip assets that have already been successfully scanned
  --export            Export registry to JSON after scanning
  --export-only       Export registry to JSON without scanning
  --output=FILE       Output file path (default: source-library.json)
  --list-seeds        List available seed configurations
  --list-sources      List registered sources
  --list-assets       List all assets
  --help, -h          Show this help message

EXAMPLES:
  # Scan all configured seeds
  pnpm registry:scan

  # Scan OpenStax only
  pnpm registry:scan:openstax
  tsx src/scripts/scan-registry.ts --seed="OpenStax"

  # Scan and export to JSON
  pnpm registry:scan:openstax --export
  tsx src/scripts/scan-registry.ts --seed="OpenStax" --export --output=library.json

  # Export existing registry data without scanning
  tsx src/scripts/scan-registry.ts --export-only
  tsx src/scripts/scan-registry.ts --export-only --output=my-library.json

  # Resume a stopped scan (skip already completed assets)
  pnpm registry:scan:openstax --skip-scanned

  # Scan Python documentation
  pnpm registry:scan:python
  tsx src/scripts/scan-registry.ts --seed="Python Documentation"

  # List available seeds
  tsx src/scripts/scan-registry.ts --list-seeds

  # List registered sources and assets
  tsx src/scripts/scan-registry.ts --list-sources
  tsx src/scripts/scan-registry.ts --list-assets
`);
}

async function listSeeds(): Promise<void> {
  console.log('\n📚 Available Seed Sources:\n');
  
  for (const seed of SEED_SOURCES) {
    console.log(`  ${seed.name}`);
    console.log(`    Type: ${seed.type}`);
    console.log(`    URL:  ${seed.seedUrl}`);
    console.log(`    Rate: ${seed.rateLimitPerMinute || 30}/min`);
    if (seed.description) {
      console.log(`    Desc: ${seed.description}`);
    }
    console.log('');
  }
}

async function listSources(service: RegistryService): Promise<void> {
  const sources = await service.getSources();
  
  console.log('\n📦 Registered Sources:\n');
  
  if (sources.length === 0) {
    console.log('  No sources registered yet. Run a scan first.');
    return;
  }
  
  for (const source of sources) {
    console.log(`  ${source.name} (${source.id})`);
    console.log(`    Type:        ${source.type}`);
    console.log(`    Base URL:    ${source.base_url}`);
    console.log(`    Scan Status: ${source.scan_status || 'never scanned'}`);
    console.log(`    Last Scan:   ${source.last_scan_at || 'never'}`);
    if (source.scan_error) {
      console.log(`    Error:       ${source.scan_error}`);
    }
    console.log('');
  }
}

async function listAssets(service: RegistryService): Promise<void> {
  const assets = await service.getAssets();
  
  console.log('\n📄 Registered Assets:\n');
  
  if (assets.length === 0) {
    console.log('  No assets registered yet. Run a scan first.');
    return;
  }
  
  // Group by source
  const bySource = new Map<string, typeof assets>();
  for (const asset of assets) {
    const sourceAssets = bySource.get(asset.source_id) || [];
    sourceAssets.push(asset);
    bySource.set(asset.source_id, sourceAssets);
  }
  
  for (const [sourceId, sourceAssets] of bySource) {
    console.log(`  Source: ${sourceId}`);
    console.log(`  ─────────────────────────────────────`);
    
    for (const asset of sourceAssets) {
      const statusIcon = asset.active ? '✅' : '⏸️';
      const tocStatus = asset.toc_extraction_success ? '✓ TOC' : '✗ TOC';
      
      console.log(`  ${statusIcon} ${asset.title}`);
      console.log(`       ID:      ${asset.id}`);
      console.log(`       Slug:    ${asset.slug}`);
      console.log(`       Robots:  ${asset.robots_status}`);
      console.log(`       ${tocStatus} (${asset.toc_stats?.total_nodes || 0} nodes)`);
      if (asset.license_name) {
        console.log(`       License: ${asset.license_name}`);
      }
      console.log('');
    }
  }
  
  const activeCount = assets.filter(a => a.active).length;
  console.log(`  Total: ${assets.length} assets (${activeCount} active)`);
}

async function scanSeed(service: RegistryService, seedName: string, skipScanned: boolean): Promise<void> {
  const seed = getSeedByName(seedName);
  
  if (!seed) {
    console.error(`\n❌ Seed not found: "${seedName}"`);
    console.log('\nAvailable seeds:');
    SEED_SOURCES.forEach(s => console.log(`  - ${s.name}`));
    process.exit(1);
  }
  
  console.log(`\n🔍 Scanning seed: ${seed.name}`);
  console.log(`   URL: ${seed.seedUrl}`);
  if (skipScanned) {
    console.log(`   Mode: Skipping already scanned assets`);
  }
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const result = await service.scanSeed(seed, { skipScanned });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Scan completed!');
    console.log(`   Duration:   ${duration}s`);
    console.log(`   Source ID:  ${result.source.id}`);
    console.log(`   Assets:     ${result.assets} scanned`);
    if (result.skipped > 0) {
      console.log(`   Skipped:    ${result.skipped} (already scanned)`);
    }
    console.log(`   TOC Nodes:  ${result.nodes}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`);
      result.errors.forEach(e => console.log(`   - ${e}`));
    }
  } catch (err) {
    console.error(`\n❌ Scan failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

async function scanSourceById(service: RegistryService, sourceId: string, skipScanned: boolean): Promise<void> {
  console.log(`\n🔍 Scanning source by ID: ${sourceId}`);
  if (skipScanned) {
    console.log(`   Mode: Skipping already scanned assets`);
  }
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const result = await service.scanSourceById(sourceId, { skipScanned });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Scan completed!');
    console.log(`   Duration:   ${duration}s`);
    console.log(`   Source:     ${result.source.name}`);
    console.log(`   Assets:     ${result.assets} scanned`);
    if (result.skipped > 0) {
      console.log(`   Skipped:    ${result.skipped} (already scanned)`);
    }
    console.log(`   TOC Nodes:  ${result.nodes}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`);
      result.errors.forEach(e => console.log(`   - ${e}`));
    }
  } catch (err) {
    console.error(`\n❌ Scan failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

async function scanAll(service: RegistryService, skipScanned: boolean): Promise<void> {
  console.log('\n🔍 Scanning all seed sources...');
  console.log(`   Seeds: ${SEED_SOURCES.map(s => s.name).join(', ')}`);
  if (skipScanned) {
    console.log(`   Mode: Skipping already scanned assets`);
  }
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const result = await service.scanAllSeeds({ skipScanned });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Scan completed!');
    console.log(`   Duration:   ${duration}s`);
    console.log(`   Sources:    ${result.sources}`);
    console.log(`   Assets:     ${result.assets} scanned`);
    if (result.skipped > 0) {
      console.log(`   Skipped:    ${result.skipped} (already scanned)`);
    }
    console.log(`   TOC Nodes:  ${result.nodes}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`);
      result.errors.forEach(e => console.log(`   - ${e}`));
    }
  } catch (err) {
    console.error(`\n❌ Scan failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

interface LibraryEntry {
  id: string;
  title: string;
  slug: string;
  url: string;
  description?: string;
  license?: {
    name?: string;
    url?: string;
  };
  subjects?: string[];
  categories?: string[];
  coverUrl?: string;
  source: {
    id: string;
    name: string;
    type: string;
  };
  toc: TocEntry[];
  metadata?: Record<string, unknown>;
}

interface TocEntry {
  title: string;
  url: string;
  type: string;
  depth: number;
  children?: TocEntry[];
}

interface LibraryExport {
  version: string;
  generatedAt: string;
  totalSources: number;
  totalAssets: number;
  totalTocNodes: number;
  sources: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    assetCount: number;
  }>;
  library: LibraryEntry[];
}

async function exportLibrary(service: RegistryService, outputFile: string): Promise<void> {
  console.log('\n📚 Exporting registry to library JSON...\n');
  
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  
  // Fetch all sources
  const { data: sources, error: sourcesError } = await supabase
    .from('source_registry_sources')
    .select('*')
    .order('name');
  
  if (sourcesError) {
    throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
  }
  
  // Fetch all active assets with their nodes
  const { data: assets, error: assetsError } = await supabase
    .from('source_registry_assets')
    .select('*')
    .order('title');
  
  if (assetsError) {
    throw new Error(`Failed to fetch assets: ${assetsError.message}`);
  }
  
  // Fetch all nodes grouped by asset
  const { data: allNodes, error: nodesError } = await supabase
    .from('source_registry_nodes')
    .select('*')
    .order('sort_order');
  
  if (nodesError) {
    throw new Error(`Failed to fetch nodes: ${nodesError.message}`);
  }
  
  // Group nodes by asset_id
  const nodesByAsset = new Map<string, typeof allNodes>();
  for (const node of allNodes || []) {
    const assetNodes = nodesByAsset.get(node.asset_id) || [];
    assetNodes.push(node);
    nodesByAsset.set(node.asset_id, assetNodes);
  }
  
  // Build source lookup
  const sourceLookup = new Map<string, typeof sources[0]>();
  for (const source of sources || []) {
    sourceLookup.set(source.id, source);
  }
  
  // Build hierarchical TOC structure
  function buildTocTree(nodes: typeof allNodes): TocEntry[] {
    if (!nodes || nodes.length === 0) return [];
    
    // Build a map of nodes by ID for parent lookup
    const nodeMap = new Map<string, TocEntry & { _id: string; _parentId?: string }>();
    const rootNodes: TocEntry[] = [];
    
    // First pass: create all entries
    for (const node of nodes) {
      const entry: TocEntry & { _id: string; _parentId?: string } = {
        _id: node.id,
        _parentId: node.parent_id,
        title: node.title,
        url: node.url,
        type: node.node_type,
        depth: node.depth,
        children: [],
      };
      nodeMap.set(node.id, entry);
    }
    
    // Second pass: build hierarchy
    for (const [, entry] of nodeMap) {
      if (entry._parentId) {
        const parent = nodeMap.get(entry._parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(entry);
        } else {
          rootNodes.push(entry);
        }
      } else {
        rootNodes.push(entry);
      }
    }
    
    // Clean up internal properties
    function cleanEntry(entry: TocEntry): TocEntry {
      const clean: TocEntry = {
        title: entry.title,
        url: entry.url,
        type: entry.type,
        depth: entry.depth,
      };
      if (entry.children && entry.children.length > 0) {
        clean.children = entry.children.map(cleanEntry);
      }
      return clean;
    }
    
    return rootNodes.map(cleanEntry);
  }
  
  // Build library entries
  const library: LibraryEntry[] = [];
  
  for (const asset of assets || []) {
    const source = sourceLookup.get(asset.source_id);
    if (!source) continue;
    
    const assetNodes = nodesByAsset.get(asset.id) || [];
    const toc = buildTocTree(assetNodes);
    
    const entry: LibraryEntry = {
      id: asset.id,
      title: asset.title,
      slug: asset.slug,
      url: asset.url,
      source: {
        id: source.id,
        name: source.name,
        type: source.source_type,
      },
      toc,
    };
    
    if (asset.description) entry.description = asset.description;
    if (asset.license_name || asset.license_url) {
      entry.license = {};
      if (asset.license_name) entry.license.name = asset.license_name;
      if (asset.license_url) entry.license.url = asset.license_url;
    }
    
    // Extract enriched metadata
    const meta = asset.metadata as Record<string, unknown> | null;
    if (meta) {
      if (meta.subjects) entry.subjects = meta.subjects as string[];
      if (meta.categories) entry.categories = meta.categories as string[];
      if (meta.coverUrl) entry.coverUrl = meta.coverUrl as string;
      
      // Store remaining metadata
      const { subjects, categories, coverUrl, ...otherMeta } = meta;
      if (Object.keys(otherMeta).length > 0) {
        entry.metadata = otherMeta;
      }
    }
    
    library.push(entry);
  }
  
  // Build export structure
  const exportData: LibraryExport = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    totalSources: sources?.length || 0,
    totalAssets: assets?.length || 0,
    totalTocNodes: allNodes?.length || 0,
    sources: (sources || []).map(s => ({
      id: s.id,
      name: s.name,
      type: s.source_type,
      url: s.base_url,
      assetCount: assets?.filter(a => a.source_id === s.id).length || 0,
    })),
    library,
  };
  
  // Write to file
  const outputPath = path.resolve(process.cwd(), outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
  
  const duration = Date.now() - startTime;
  
  console.log('✅ Library exported successfully!\n');
  console.log(`   File:         ${outputPath}`);
  console.log(`   Sources:      ${exportData.totalSources}`);
  console.log(`   Assets:       ${exportData.totalAssets}`);
  console.log(`   TOC Nodes:    ${exportData.totalTocNodes}`);
  console.log(`   Duration:     ${duration}ms\n`);
}

async function main(): Promise<void> {
  const args = parseArgs();
  
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  
  if (args.listSeeds) {
    await listSeeds();
    process.exit(0);
  }
  
  // Initialize service for DB operations
  let service: RegistryService;
  try {
    const supabase = getSupabaseAdmin();
    service = new RegistryService(supabase);
  } catch (err) {
    console.error('❌ Failed to initialize service. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    console.error((err as Error).message);
    process.exit(1);
  }
  
  if (args.listSources) {
    await listSources(service);
    process.exit(0);
  }
  
  if (args.listAssets) {
    await listAssets(service);
    process.exit(0);
  }
  
  // Export only mode (no scanning)
  if (args.exportOnly) {
    const outputFile = args.outputFile || 'source-library.json';
    await exportLibrary(service, outputFile);
    process.exit(0);
  }
  
  // Perform scan
  const skipScanned = args.skipScanned || false;
  
  if (args.seed) {
    await scanSeed(service, args.seed, skipScanned);
  } else if (args.sourceId) {
    await scanSourceById(service, args.sourceId, skipScanned);
  } else {
    await scanAll(service, skipScanned);
  }
  
  // Export after scan if requested
  if (args.export) {
    const outputFile = args.outputFile || 'source-library.json';
    await exportLibrary(service, outputFile);
  } else {
    console.log('\n📝 Use --list-sources or --list-assets to see results.');
    console.log('   Use --export to save library to JSON.');
    console.log('   To activate an asset, use the API: POST /registry/activate-asset\n');
  }
}

main()
  .then(() => {
    // Give time for async operations to complete before exit
    setTimeout(() => process.exit(0), 100);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    setTimeout(() => process.exit(1), 100);
  });


