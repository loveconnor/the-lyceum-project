/**
 * Source Registry Routes
 * HTTP API for source registry operations
 */

import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../supabaseAdmin';
import { RegistryService, SEED_SOURCES, getSeedByName, logger } from '../source-registry';

const router = Router();

/**
 * POST /registry/scan
 * Scan all seed sources or a specific source
 * Query params:
 *   - source_id: (optional) UUID of specific source to scan
 *   - seed_name: (optional) Name of seed to scan
 *   - skip_scanned: (optional) Skip assets that have already been successfully scanned
 */
router.post('/scan', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseAdmin();
    const service = new RegistryService(supabase);

    const { source_id, seed_name, skip_scanned } = req.query;
    const skipScanned = skip_scanned === 'true';

    let result;

    if (source_id && typeof source_id === 'string') {
      // Scan specific source by ID
      logger.info('api', `Scanning source by ID: ${source_id}${skipScanned ? ' (skip scanned)' : ''}`);
      result = await service.scanSourceById(source_id, { skipScanned });
      
      return res.json({
        success: true,
        duration: Date.now() - startTime,
        source: {
          id: result.source.id,
          name: result.source.name,
        },
        assets_scanned: result.assets,
        assets_skipped: result.skipped,
        nodes_mapped: result.nodes,
        errors: result.errors,
      });
    } else if (seed_name && typeof seed_name === 'string') {
      // Scan specific seed by name
      const seed = getSeedByName(seed_name);
      if (!seed) {
        return res.status(404).json({
          error: `Seed not found: ${seed_name}`,
          available_seeds: SEED_SOURCES.map(s => s.name),
        });
      }

      logger.info('api', `Scanning seed: ${seed_name}${skipScanned ? ' (skip scanned)' : ''}`);
      result = await service.scanSeed(seed, { skipScanned });

      return res.json({
        success: true,
        duration: Date.now() - startTime,
        source: {
          id: result.source.id,
          name: result.source.name,
        },
        assets_scanned: result.assets,
        assets_skipped: result.skipped,
        nodes_mapped: result.nodes,
        errors: result.errors,
      });
    } else {
      // Scan all seeds
      logger.info('api', `Scanning all seeds${skipScanned ? ' (skip scanned)' : ''}`);
      result = await service.scanAllSeeds({ skipScanned });

      return res.json({
        success: true,
        duration: Date.now() - startTime,
        sources_scanned: result.sources,
        assets_scanned: result.assets,
        assets_skipped: result.skipped,
        nodes_mapped: result.nodes,
        errors: result.errors,
      });
    }
  } catch (err) {
    logger.error('api', `Scan failed: ${(err as Error).message}`);
    return res.status(500).json({
      error: 'Scan failed',
      message: (err as Error).message,
      duration: Date.now() - startTime,
    });
  }
});

/**
 * GET /registry/sources
 * Get all registered sources
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const service = new RegistryService(supabase);

    const sources = await service.getSources();

    return res.json({
      sources,
      count: sources.length,
      available_seeds: SEED_SOURCES.map(s => ({
        name: s.name,
        type: s.type,
        base_url: s.baseUrl,
      })),
    });
  } catch (err) {
    logger.error('api', `Failed to get sources: ${(err as Error).message}`);
    return res.status(500).json({
      error: 'Failed to get sources',
      message: (err as Error).message,
    });
  }
});

/**
 * GET /registry/sources/:id
 * Get a specific source
 */
router.get('/sources/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const service = new RegistryService(supabase);

    const source = await service.getSourceById(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    // Get assets for this source
    const assets = await service.getAssets(source.id);

    return res.json({
      source,
      assets,
      assets_count: assets.length,
      active_assets: assets.filter(a => a.active).length,
    });
  } catch (err) {
    logger.error('api', `Failed to get source: ${(err as Error).message}`);
    return res.status(500).json({
      error: 'Failed to get source',
      message: (err as Error).message,
    });
  }
});

/**
 * GET /registry/assets
 * Get all assets, optionally filtered by source
 * Query params:
 *   - source_id: (optional) UUID of source to filter by
 *   - active: (optional) Filter by active status ('true' or 'false')
 */
router.get('/assets', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const service = new RegistryService(supabase);

    const { source_id, active } = req.query;

    let assets = await service.getAssets(
      typeof source_id === 'string' ? source_id : undefined
    );

    // Filter by active status if specified
    if (active !== undefined) {
      const isActive = active === 'true';
      assets = assets.filter(a => a.active === isActive);
    }

    return res.json({
      assets,
      count: assets.length,
    });
  } catch (err) {
    logger.error('api', `Failed to get assets: ${(err as Error).message}`);
    return res.status(500).json({
      error: 'Failed to get assets',
      message: (err as Error).message,
    });
  }
});

/**
 * GET /registry/assets/:id
 * Get a specific asset with its TOC nodes
 */
router.get('/assets/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const service = new RegistryService(supabase);

    const asset = await service.getAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Get TOC nodes
    const nodes = await service.getTocNodes(asset.id);

    return res.json({
      asset,
      nodes,
      nodes_count: nodes.length,
    });
  } catch (err) {
    logger.error('api', `Failed to get asset: ${(err as Error).message}`);
    return res.status(500).json({
      error: 'Failed to get asset',
      message: (err as Error).message,
    });
  }
});

/**
 * POST /registry/activate-asset
 * Manually activate an asset
 * Body: { asset_id: string }
 */
router.post('/activate-asset', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const service = new RegistryService(supabase);

    const { asset_id } = req.body;

    if (!asset_id) {
      return res.status(400).json({ error: 'asset_id is required' });
    }

    const asset = await service.activateAsset(asset_id);

    logger.info('api', `Activated asset: ${asset.title}`, { assetId: asset.id });

    return res.json({
      success: true,
      asset,
    });
  } catch (err) {
    logger.error('api', `Failed to activate asset: ${(err as Error).message}`);
    return res.status(400).json({
      error: 'Failed to activate asset',
      message: (err as Error).message,
    });
  }
});

/**
 * POST /registry/deactivate-asset
 * Deactivate an asset
 * Body: { asset_id: string }
 */
router.post('/deactivate-asset', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const service = new RegistryService(supabase);

    const { asset_id } = req.body;

    if (!asset_id) {
      return res.status(400).json({ error: 'asset_id is required' });
    }

    const asset = await service.deactivateAsset(asset_id);

    logger.info('api', `Deactivated asset: ${asset.title}`, { assetId: asset.id });

    return res.json({
      success: true,
      asset,
    });
  } catch (err) {
    logger.error('api', `Failed to deactivate asset: ${(err as Error).message}`);
    return res.status(400).json({
      error: 'Failed to deactivate asset',
      message: (err as Error).message,
    });
  }
});

/**
 * GET /registry/logs
 * Get scan logs
 * Query params:
 *   - source_id: (optional) Filter by source
 *   - asset_id: (optional) Filter by asset
 *   - limit: (optional) Max logs to return (default 100)
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const service = new RegistryService(supabase);

    const { source_id, asset_id, limit } = req.query;

    const logs = await service.getScanLogs({
      sourceId: typeof source_id === 'string' ? source_id : undefined,
      assetId: typeof asset_id === 'string' ? asset_id : undefined,
      limit: limit ? parseInt(limit as string, 10) : 100,
    });

    return res.json({
      logs,
      count: logs.length,
    });
  } catch (err) {
    logger.error('api', `Failed to get logs: ${(err as Error).message}`);
    return res.status(500).json({
      error: 'Failed to get logs',
      message: (err as Error).message,
    });
  }
});

/**
 * GET /registry/seeds
 * Get available seed configurations
 */
router.get('/seeds', async (req: Request, res: Response) => {
  return res.json({
    seeds: SEED_SOURCES.map(s => ({
      name: s.name,
      type: s.type,
      base_url: s.baseUrl,
      seed_url: s.seedUrl,
      description: s.description,
      rate_limit_per_minute: s.rateLimitPerMinute,
    })),
  });
});

export default router;


