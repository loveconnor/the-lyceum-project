import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../supabaseAdmin";
import { updateDashboardActivity } from "../dashboardService";
import { generatePathOutline, generateModuleContent, generateModuleFromSourceContent } from "../ai-path-generator";
import { generateLearnByDoingTree } from "../learn-by-doing";
import { generateRegistryBackedPath } from "../ai-path-generator-registry";
import { 
  createModuleCompletionNotification, 
  createPathCompletionNotification 
} from "../notificationService";
import { ModuleGroundingService, DynamicSourceFetcher, MitOcwFetcher, WebDocsSearcher, logger } from "../source-registry";
import { 
  enrichModuleWithVisuals, 
  formatVisualsForFrontend,
  shouldUseVisualAids,
  type GenerateVisualIntentRequest 
} from "../visual-enrichment";

const router = Router();

// Helper function to calculate path status based on items
function calculatePathStatus(items: any[]): string {
  if (!items || items.length === 0) {
    return 'not-started';
  }
  
  const completedCount = items.filter(item => item.status === 'completed').length;
  const inProgressCount = items.filter(item => item.status === 'in-progress').length;
  
  // If all items are completed, path is completed
  if (completedCount === items.length) {
    return 'completed';
  }
  
  // If any item is in-progress or completed, path is in-progress
  if (inProgressCount > 0 || completedCount > 0) {
    return 'in-progress';
  }
  
  // Otherwise, path is not started
  return 'not-started';
}

// Get available source registry assets for path generation
router.get("/registry-assets", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const groundingService = new ModuleGroundingService(supabase);
    const assets = await groundingService.getActiveAssets();

    // Return summary info suitable for selection UI
    const assetSummaries = assets.map(asset => ({
      id: asset.id,
      title: asset.title,
      description: asset.description,
      url: asset.url,
      license_name: asset.license_name,
      toc_stats: asset.toc_stats,
    }));

    return res.json(assetSummaries);

  } catch (error) {
    console.error("Error in GET /paths/registry-assets:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get TOC for a specific registry asset
router.get("/registry-assets/:assetId/toc", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { assetId } = req.params;
    const groundingService = new ModuleGroundingService(supabase);
    
    const asset = await groundingService.getAsset(assetId);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const tocSummaries = await groundingService.getTocSummaries(assetId);

    return res.json({
      asset: {
        id: asset.id,
        title: asset.title,
        description: asset.description,
      },
      toc: tocSummaries
    });

  } catch (error) {
    console.error("Error in GET /paths/registry-assets/:assetId/toc:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Search OpenStax for relevant books based on a topic
// This searches the live OpenStax catalog
router.get("/registry-assets/search/:query", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { query } = req.params;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const dynamicFetcher = new DynamicSourceFetcher(supabase);
    const results = await dynamicFetcher.searchBooksByTopic(query);

    // Return top 10 matches
    const topResults = results.slice(0, 10).map(r => ({
      slug: r.book.slug,
      title: r.book.title,
      description: r.book.description,
      subjects: r.book.subjects,
      score: r.score,
      matchedTerms: r.matchedTerms,
    }));

    return res.json({
      query,
      results: topResults,
      totalFound: results.length
    });

  } catch (error) {
    console.error("Error in GET /paths/registry-assets/search/:query:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get OpenStax book by slug and optionally fetch its TOC on-demand
router.get("/registry-assets/openstax/:slug", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { slug } = req.params;
    const { fetchToc } = req.query;

    const dynamicFetcher = new DynamicSourceFetcher(supabase);
    const books = await dynamicFetcher.getOpenStaxBooks();
    
    const book = books.find(b => b.slug === slug);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // If TOC requested, get or create asset and fetch TOC
    if (fetchToc === 'true') {
      const asset = await dynamicFetcher.getOrCreateAsset(book);
      const tocSummaries = await dynamicFetcher.getTocSummaries(asset);
      
      return res.json({
        asset: {
          id: asset.id,
          slug: asset.slug,
          title: asset.title,
          description: asset.description,
        },
        book,
        toc: tocSummaries
      });
    }

    return res.json({ book });

  } catch (error) {
    console.error("Error in GET /paths/registry-assets/openstax/:slug:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all learning paths for current user
router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: paths, error } = await supabase
      .from("learning_paths")
      .select(`
        *,
        learning_path_items (
          id,
          lab_id,
          order_index,
          title,
          description,
          item_type,
          status,
          completed_at,
          labs (
            id,
            title,
            description,
            status
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching learning paths:", error);
      return res.status(500).json({ error: "Failed to fetch learning paths" });
    }

    // Update path statuses based on items
    const updatedPaths = await Promise.all((paths || []).map(async (path: any) => {
      const items = path.learning_path_items || [];
      const calculatedStatus = calculatePathStatus(items);
      
      // Update in database if status has changed
      if (calculatedStatus !== path.status) {
        const { error: updateError } = await supabase
          .from("learning_paths")
          .update({ status: calculatedStatus })
          .eq("id", path.id);
        
        if (!updateError) {
          path.status = calculatedStatus;
        }
      }
      
      return path;
    }));

    return res.json(updatedPaths);
  } catch (error) {
    console.error("Error in GET /paths:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get single learning path with all items
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const { data: path, error } = await supabase
      .from("learning_paths")
      .select(`
        *,
        learning_path_items (
          id,
          lab_id,
          order_index,
          title,
          description,
          item_type,
          status,
          completed_at,
          labs (
            id,
            title,
            description,
            status,
            difficulty,
            estimated_duration
          )
        )
      `)
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching learning path:", error);
      return res.status(404).json({ error: "Learning path not found" });
    }

    // Update path status based on items
    const items = path.learning_path_items || [];
    const calculatedStatus = calculatePathStatus(items);
    
    // Update in database if status has changed
    if (calculatedStatus !== path.status) {
      const { error: updateError } = await supabase
        .from("learning_paths")
        .update({ status: calculatedStatus })
        .eq("id", path.id);
      
      if (!updateError) {
        path.status = calculatedStatus;
      }
    }

    return res.json(path);
  } catch (error) {
    console.error("Error in GET /paths/:id:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create new learning path
router.post("/", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      title,
      description,
      topics,
      difficulty,
      estimated_duration,
      items
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Create the learning path
    const { data: newPath, error: pathError } = await supabase
      .from("learning_paths")
      .insert([
        {
          user_id: userId,
          title,
          description,
          topics,
          difficulty,
          estimated_duration,
          status: "not-started",
          progress: 0
        }
      ])
      .select()
      .single();

    if (pathError) {
      console.error("Error creating learning path:", pathError);
      return res.status(500).json({ error: "Failed to create learning path" });
    }

    // Create path items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const pathItems = items.map((item: any, index: number) => ({
        path_id: newPath.id,
        lab_id: item.lab_id || null,
        order_index: index,
        title: item.title,
        description: item.description,
        item_type: item.item_type || 'lab',
        status: 'not-started'
      }));

      const { error: itemsError } = await supabase
        .from("learning_path_items")
        .insert(pathItems);

      if (itemsError) {
        console.error("Error creating path items:", itemsError);
        // Don't fail the whole request, just log the error
      }
    }

    // Update dashboard
    try {
      await updateDashboardActivity(userId, {
        activityType: 'path_started',
        topics: topics || [],
        minutes: 0,
      });
    } catch (dashError) {
      console.error('Error updating dashboard:', dashError);
    }

    return res.status(201).json(newPath);
  } catch (error) {
    console.error("Error in POST /paths:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// AI-generate learning path with modules and content
// NOW USES SOURCE REGISTRY BY DEFAULT - falls back to AI-generated if no matching content
router.post("/generate", async (req: Request, res: Response) => {
  const stream = req.query.stream === 'true';

  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      title,
      description,
      estimatedDuration,
      topics,
      source_asset_id, // Optional - if provided, use this specific asset
      use_ai_only, // Optional - force AI-generated content (skip registry)
      learn_by_doing // Optional - generate learn-by-doing modules
    } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
    }

    // Get user's difficulty/experience level from onboarding data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_data")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
    }

    const experienceMap: Record<string, 'intro' | 'intermediate' | 'advanced'> = {
      'new': 'intro',
      'familiar': 'intermediate',
      'comfortable': 'advanced'
    };

    const experience = profile?.onboarding_data?.workPreferences?.experience;
    const difficulty = experience ? (experienceMap[experience] || 'intermediate') : 'intermediate';

    console.log(`[Generate] Using difficulty level: ${difficulty}`);
    console.log(`[Generate] Description: "${description}"`);
    console.log(`[Generate] Topics: ${topics?.join(', ') || 'none'}`);

    const learnByDoingEnabled = Boolean(learn_by_doing);
    const buildLearnByDoingPrompt = (moduleOutline: { title: string; description?: string }) => {
      const base = moduleOutline.description
        ? `${moduleOutline.title}: ${moduleOutline.description}`
        : moduleOutline.title;
      return base.slice(0, 140);
    };

    // ============================================
    // STEP 1: Try to find matching Source Registry content
    // ============================================
    
    if (!use_ai_only) {
      console.log(`[Generate] 🔍 Searching Source Registry for matching content...`);
      
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'status', message: '🔍 Searching OpenStax for relevant educational content...' })}\n\n`);
      }

      const dynamicFetcher = new DynamicSourceFetcher(supabase);
      const groundingService = new ModuleGroundingService(supabase);

      let asset: any = null;
      let tocSummaries: any[] = [];

      try {
        if (source_asset_id) {
          // Use provided asset ID
          console.log(`[Generate] Using provided source_asset_id: ${source_asset_id}`);
          asset = await groundingService.getAsset(source_asset_id);
          if (asset && asset.active) {
            tocSummaries = await groundingService.getTocSummaries(source_asset_id);
          }
        } else {
          // Auto-discover content from OpenStax
          const searchQuery = [description, ...(topics || [])].join(' ');
          console.log(`[Generate] Search query: "${searchQuery}"`);
          
          if (stream) {
            res.write(`data: ${JSON.stringify({ type: 'status', message: 'Fetching OpenStax textbook catalog...' })}\n\n`);
          }
          
          const books = await dynamicFetcher.getOpenStaxBooks();
          console.log(`[Generate] OpenStax catalog: ${books.length} books available`);
          
          if (stream) {
            res.write(`data: ${JSON.stringify({ type: 'status', message: `Found ${books.length} OpenStax textbooks. Finding best match...` })}\n\n`);
          }
          
          const searchResults = await dynamicFetcher.searchBooksByTopic(searchQuery);
          
          // Require score >= 8 for a meaningful match
          // Lower scores often indicate false positives (e.g., generic word matches)
          const MIN_MATCH_SCORE = 8;
          
          if (searchResults.length > 0 && searchResults[0].score >= MIN_MATCH_SCORE) {
            const bestMatch = searchResults[0];
            console.log(`[Generate] ✅ Best match: "${bestMatch.book.title}" (score: ${bestMatch.score})`);
            console.log(`[Generate] Matched terms: ${bestMatch.matchedTerms.join(', ')}`);
            
            if (stream) {
              res.write(`data: ${JSON.stringify({ 
                type: 'status', 
                message: `✅ Found match: "${bestMatch.book.title}" (matched: ${bestMatch.matchedTerms.join(', ')})`
              })}\n\n`);
              res.write(`data: ${JSON.stringify({ type: 'status', message: 'Loading source into registry...' })}\n\n`);
            }
            
            asset = await dynamicFetcher.getOrCreateAsset(bestMatch.book);
            
            if (stream) {
              res.write(`data: ${JSON.stringify({ type: 'status', message: 'Fetching table of contents...' })}\n\n`);
            }
            
            tocSummaries = await dynamicFetcher.getTocSummaries(asset);
            console.log(`[Generate] TOC loaded: ${tocSummaries.length} nodes`);
            
            if (stream) {
              res.write(`data: ${JSON.stringify({ 
                type: 'source_discovered', 
                source: { id: asset.id, title: asset.title }
              })}\n\n`);
            }
          } else {
            const bestScore = searchResults[0]?.score || 0;
            const bestTitle = searchResults[0]?.book?.title || 'none';
            console.log(`[Generate] No good OpenStax match. Best: "${bestTitle}" (score: ${bestScore}, need: ${MIN_MATCH_SCORE})`);
            
            // ============================================
            // TRY MIT OCW NEXT
            // ============================================
            console.log(`[Generate] 🎓 Searching MIT OpenCourseWare...`);
            
            if (stream) {
              res.write(`data: ${JSON.stringify({ 
                type: 'status', 
                message: '🎓 Searching MIT OpenCourseWare for relevant courses...'
              })}\n\n`);
            }

            const mitOcwFetcher = new MitOcwFetcher(supabase);
            const mitSearchResults = await mitOcwFetcher.searchCoursesByTopic(searchQuery);
            
            const MIT_MIN_MATCH_SCORE = 10;
            
            if (mitSearchResults.length > 0 && mitSearchResults[0].score >= MIT_MIN_MATCH_SCORE) {
              const bestMitMatch = mitSearchResults[0];
              console.log(`[Generate] ✅ Found MIT OCW course: "${bestMitMatch.course.title}" (score: ${bestMitMatch.score})`);
              console.log(`[Generate] Matched terms: ${bestMitMatch.matchedTerms.join(', ')}`);
              
              if (stream) {
                res.write(`data: ${JSON.stringify({ 
                  type: 'status', 
                  message: `✅ Found MIT course: "${bestMitMatch.course.title}" (matched: ${bestMitMatch.matchedTerms.join(', ')})`
                })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'status', message: 'Loading MIT OCW into registry...' })}\n\n`);
              }
              
              asset = await mitOcwFetcher.getOrCreateAsset(bestMitMatch.course);
              
              if (stream) {
                res.write(`data: ${JSON.stringify({ type: 'status', message: 'Fetching course structure...' })}\n\n`);
              }
              
              tocSummaries = await mitOcwFetcher.getTocSummaries(asset);
              console.log(`[Generate] MIT OCW TOC loaded: ${tocSummaries.length} nodes`);
              
              if (stream) {
                res.write(`data: ${JSON.stringify({ 
                  type: 'source_discovered', 
                  source: { id: asset.id, title: asset.title, type: 'mit_ocw' }
                })}\n\n`);
              }
            } else {
              const mitBestScore = mitSearchResults[0]?.score || 0;
              const mitBestTitle = mitSearchResults[0]?.course?.title || 'none';
              console.log(`[Generate] ⚠️ No good MIT OCW match. Best: "${mitBestTitle}" (score: ${mitBestScore}, need: ${MIT_MIN_MATCH_SCORE})`);
              
              // ============================================
              // FALLBACK: Try web documentation sources
              // ============================================
              console.log(`[Generate] 🌐 Searching web documentation sources...`);
              
              if (stream) {
                res.write(`data: ${JSON.stringify({ 
                  type: 'status', 
                  message: '🌐 Searching web documentation (MDN, official docs, tutorials)...'
                })}\n\n`);
              }

              const webDocsSearcher = new WebDocsSearcher(supabase);
              const webDocsResult = await webDocsSearcher.discoverDocsForTopic(searchQuery);

              if (webDocsResult) {
                asset = webDocsResult.asset;
                tocSummaries = webDocsResult.tocSummaries;
                
                console.log(`[Generate] ✅ Found web docs: "${webDocsResult.source.name}" (${tocSummaries.length} sections)`);
                
                if (stream) {
                  res.write(`data: ${JSON.stringify({ 
                    type: 'status', 
                    message: `✅ Found documentation: "${webDocsResult.source.name}"`
                  })}\n\n`);
                  res.write(`data: ${JSON.stringify({ 
                    type: 'source_discovered', 
                    source: { id: asset.id, title: asset.title, type: 'web_docs' }
                  })}\n\n`);
                }
              } else {
                console.log(`[Generate] ⚠️ No web documentation found either`);
                
                if (stream) {
                  res.write(`data: ${JSON.stringify({ 
                    type: 'status', 
                    message: 'ℹ️ No matching documentation found. Using AI-generated content...'
                  })}\n\n`);
                }
              }
            }
          }
        }

        // If we found registry content, use registry-backed generation
        if (asset && tocSummaries.length > 0) {
          console.log(`[Generate] 📚 Using REGISTRY-BACKED generation with "${asset.title}"`);
          
          if (stream) {
            res.write(`data: ${JSON.stringify({ 
              type: 'status', 
              message: `Generating path from "${asset.title}" (${tocSummaries.length} sections)`
            })}\n\n`);
          }

          // Generate registry-aware outline
          const { outline, moduleNodeMappings } = await generateRegistryBackedPath(
            {
              title: title || "",
              description,
              difficulty,
              estimatedDuration,
              topics,
              source_asset_id: asset.id
            },
            tocSummaries,
            asset.title
          );

          console.log(`[Generate] Outline: "${outline.title}" with ${outline.modules.length} modules`);
          
          if (stream) {
            res.write(`data: ${JSON.stringify({ 
              type: 'status', 
              message: `✨ Generated: "${outline.title}" with ${outline.modules.length} modules`
            })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'outline', outline })}\n\n`);
          }

          // Create the learning path
          const { data: newPath, error: pathError } = await supabase
            .from("learning_paths")
            .insert([{
              user_id: userId,
              title: outline.title,
              description: outline.description,
              topics: outline.topics,
              difficulty: outline.difficulty,
              estimated_duration: outline.estimated_duration * 60,
              status: "not-started",
              progress: 0
            }])
            .select()
            .single();

          if (pathError) {
            throw new Error(`Failed to create path: ${pathError.message}`);
          }

          console.log(`[Generate] Path created: ${newPath.id}`);

          // Count how many modules have source content
          let modulesWithContent = 0;
          for (const moduleOutline of outline.modules) {
            const nodeIds = moduleNodeMappings.get(moduleOutline.order_index) || [];
            if (nodeIds.length > 0) modulesWithContent++;
          }

          const contentCoverage = modulesWithContent / outline.modules.length;
          console.log(`[Generate] Content coverage: ${modulesWithContent}/${outline.modules.length} modules (${Math.round(contentCoverage * 100)}%)`);

          if (modulesWithContent === 0) {
            console.log(`[Generate] No registry sections mapped. Falling back to AI-generated content.`);
            throw new Error('NO_REGISTRY_CONTENT_FOUND');
          }

          // CRITICAL: If less than 30% of modules have content, the source is not relevant
          // Fall back to AI-generated content instead of creating broken registry-backed path
          if (contentCoverage < 0.3) {
            console.log(`[Generate] ⚠️ Insufficient content coverage (${Math.round(contentCoverage * 100)}%). Source "${asset.title}" is not relevant.`);
            console.log(`[Generate] 🔄 Falling back to AI-generated content...`);
            
            if (stream) {
              res.write(`data: ${JSON.stringify({ 
                type: 'status', 
                message: `⚠️ Source "${asset.title}" doesn't cover this topic well. Switching to AI generation...`
              })}\n\n`);
            }
            
            // Throw to trigger fallback to AI generation
            throw new Error('INSUFFICIENT_CONTENT_COVERAGE');
          }

          // Create registry-backed modules
          const allPathItems: any[] = [];
          let currentOrderIndex = 0;
          const groundingService = new ModuleGroundingService(supabase);

          for (const moduleOutline of outline.modules) {
            const nodeIds = moduleNodeMappings.get(moduleOutline.order_index) || [];
            const contentUnavailable = nodeIds.length === 0;
            
            console.log(`[Generate] Module "${moduleOutline.title}": ${nodeIds.length} source nodes`);
            
            if (stream) {
              res.write(`data: ${JSON.stringify({ 
                type: 'module_mapping', 
                title: moduleOutline.title, 
                nodeCount: nodeIds.length,
                hasContent: !contentUnavailable
              })}\n\n`);
            }

            // Generate module content now if we have source nodes
            let moduleContent = null;
            const learnByDoingPrompt = buildLearnByDoingPrompt(moduleOutline);

            if (learnByDoingEnabled) {
              try {
                const generated = await generateLearnByDoingTree(learnByDoingPrompt);
                moduleContent = {
                  prompt: learnByDoingPrompt,
                  tree: generated.tree,
                  stream: generated.streamLines
                };
              } catch (error) {
                console.error(`[Generate] Learn-by-doing failed for "${moduleOutline.title}":`, error);
                moduleContent = { prompt: learnByDoingPrompt };
              }
              if (stream) {
                res.write(`data: ${JSON.stringify({
                  type: 'module_complete',
                  title: moduleOutline.title,
                  chaptersCount: 0
                })}\n\n`);
              }
            } else if (!contentUnavailable) {
              try {
                if (stream) {
                  res.write(`data: ${JSON.stringify({ 
                    type: 'module_start', 
                    title: moduleOutline.title,
                    message: `🎨 Generating "${moduleOutline.title}" from source material...`
                  })}\n\n`);
                }

                console.log(`[Generate] Generating content for "${moduleOutline.title}"...`);
                
                // Step 1: Synthesize from source
                const renderedContent = await groundingService.renderModuleContent(
                  '', // No item ID yet
                  moduleOutline.title,
                  moduleOutline.description,
                  asset.id,
                  nodeIds,
                  outline.difficulty || 'intermediate'
                );

                console.log(`[Generate] Synthesized ${renderedContent.sections.length} sections`);

                // Check if source content is unavailable or insufficient
                if (renderedContent.unavailable_reason) {
                  console.log(`[Generate] ⚠️ Source content unavailable: ${renderedContent.unavailable_reason}`);
                  console.log(`[Generate] Falling back to AI-only generation for "${moduleOutline.title}"`);
                  
                  // Fall back to AI-only generation
                  moduleContent = await generateModuleContent(
                    moduleOutline.title,
                    moduleOutline.description,
                    `${outline.title}: ${outline.description}`,
                    outline.difficulty || 'intermediate',
                    moduleOutline.order_index
                  );
                } else {
                  // Step 2: Generate full structured module from source
                  moduleContent = await generateModuleFromSourceContent(
                    moduleOutline.title,
                    moduleOutline.description,
                    `${outline.title}: ${outline.description}`,
                    outline.difficulty || 'intermediate',
                    {
                      overview: renderedContent.overview,
                      learning_objectives: renderedContent.learning_objectives,
                      sections: renderedContent.sections,
                      key_concepts: renderedContent.key_concepts
                    }
                  );
                }

                console.log(`[Generate] ✓ Generated module with ${moduleContent.chapters?.length || 0} chapters`);
                
                if (stream) {
                  res.write(`data: ${JSON.stringify({ 
                    type: 'module_complete', 
                    title: moduleOutline.title,
                    chaptersCount: moduleContent.chapters?.length || 0
                  })}\n\n`);
                }
              } catch (error) {
                console.error(`[Generate] Failed to generate "${moduleOutline.title}":`, error);
                moduleContent = null;
              }
            }

            // Determine if this module would benefit from visual aids
            // This is a quick heuristic check - actual visuals are fetched during rendering
            let usesVisualAids = false;
            if (!learnByDoingEnabled) {
              try {
                usesVisualAids = await shouldUseVisualAids(
                  moduleOutline.title,
                  moduleOutline.description
                );
                if (usesVisualAids) {
                  console.log(`[Generate] Module "${moduleOutline.title}" flagged for visual aids`);
                }
              } catch (visualError) {
                // Visual check is non-critical - continue without flag
                console.warn(`[Generate] Visual aids check failed for "${moduleOutline.title}":`, visualError);
              }
            }

            allPathItems.push({
              path_id: newPath.id,
              lab_id: null,
              order_index: currentOrderIndex++,
              title: moduleOutline.title,
              description: moduleOutline.description,
              item_type: 'module',
              status: 'not-started',
              content_mode: learnByDoingEnabled ? 'learn_by_doing' : 'registry_backed',
              source_asset_id: asset.id,
              source_node_ids: nodeIds,
              content_unavailable: learnByDoingEnabled ? false : contentUnavailable,
              last_resolved_at: new Date().toISOString(),
              content_data: moduleContent,
              uses_visual_aids: usesVisualAids  // NEW: Flag for visual enrichment
            });

            // Add lab suggestion
            if (moduleOutline.order_index < outline.modules.length - 1) {
              allPathItems.push({
                path_id: newPath.id,
                lab_id: null,
                order_index: currentOrderIndex++,
                title: `Practice Lab: ${moduleOutline.title}`,
                description: `Apply what you learned in "${moduleOutline.title}" through hands-on practice.`,
                item_type: 'lab',
                status: 'not-started',
                content_mode: 'ai_generated',
                content_data: { suggested: true, module_context: moduleOutline.title }
              });
            }
          }

          // Insert path items
          if (allPathItems.length > 0) {
            const { error: itemsError } = await supabase
              .from("learning_path_items")
              .insert(allPathItems);

            if (itemsError) {
              throw new Error(`Failed to create path items: ${itemsError.message}`);
            }
          }

          console.log(`[Generate] ✅ Registry-backed path complete!`);
          console.log(`[Generate] - ${modulesWithContent}/${outline.modules.length} modules have source content`);

          // Update dashboard
          try {
            await updateDashboardActivity(userId, {
              activityType: 'path_started',
              topics: outline.topics || [],
              minutes: 0,
            });
          } catch (e) { /* ignore */ }

          // Fetch complete path
          const { data: completePath } = await supabase
            .from("learning_paths")
            .select(`*, learning_path_items (*)`)
            .eq("id", newPath.id)
            .single();

          if (stream) {
            res.write(`data: ${JSON.stringify({ 
              type: 'status', 
              message: `🎉 Path ready! Grounded in "${asset.title}"`
            })}\n\n`);
            res.write(`data: ${JSON.stringify({ 
              type: 'completed', 
              path: completePath, 
              source_asset: asset,
              content_mode: 'registry_backed'
            })}\n\n`);
            res.end();
            return;
          }

          return res.status(201).json({ ...completePath, source_asset: asset, content_mode: 'registry_backed' });
        }

      } catch (registryError) {
        console.error(`[Generate] Registry lookup failed:`, registryError);
        console.log(`[Generate] Falling back to AI-generated content...`);
        
        if (stream) {
          res.write(`data: ${JSON.stringify({ 
            type: 'status', 
            message: '⚠️ Could not find matching source. Using AI-generated content...'
          })}\n\n`);
        }
      }
    }

    // ============================================
    // STEP 2: Fall back to AI-generated content
    // ============================================
    
    console.log(`[Generate] 🤖 Using AI-GENERATED content (no registry match)`);
    
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: '🤖 Generating content with AI...' })}\n\n`);
    }

    const outline = await generatePathOutline({
      title: title || "",
      description,
      difficulty,
      estimatedDuration,
      topics
    });

    console.log(`[Generate] Outline: ${outline.modules.length} modules`);
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'outline', outline })}\n\n`);
    }

    // Create path
    const { data: newPath, error: pathError } = await supabase
      .from("learning_paths")
      .insert([{
        user_id: userId,
        title: outline.title,
        description: outline.description,
        topics: outline.topics,
        difficulty: outline.difficulty,
        estimated_duration: outline.estimated_duration * 60,
        status: "not-started",
        progress: 0
      }])
      .select()
      .single();

    if (pathError) {
      throw new Error(`Failed to create path: ${pathError.message}`);
    }

    console.log(`[Generate] Path created: ${newPath.id}`);

    // Generate AI content for modules
    const moduleItems: any[] = [];
    for (let i = 0; i < outline.modules.length; i++) {
      const moduleOutline = outline.modules[i];
      console.log(`[Generate] Generating AI content for: "${moduleOutline.title}"...`);
      
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'module_start', title: moduleOutline.title, index: i })}\n\n`);
      }

      try {
        const learnByDoingPrompt = buildLearnByDoingPrompt(moduleOutline);

        if (learnByDoingEnabled) {
          let learnByDoingContent: any = { prompt: learnByDoingPrompt };

          try {
            const generated = await generateLearnByDoingTree(learnByDoingPrompt);
            learnByDoingContent = {
              prompt: learnByDoingPrompt,
              tree: generated.tree,
              stream: generated.streamLines
            };
          } catch (error) {
            console.error(`[Generate] Learn-by-doing failed for "${moduleOutline.title}":`, error);
          }

          moduleItems.push({
            path_id: newPath.id,
            lab_id: null,
            order_index: i,
            title: moduleOutline.title,
            description: moduleOutline.description,
            item_type: 'module',
            status: 'not-started',
            content_mode: 'learn_by_doing',
            content_data: learnByDoingContent,
            uses_visual_aids: false
          });
        } else {
          const content = await generateModuleContent(
            moduleOutline.title,
            moduleOutline.description,
            `${outline.title}: ${outline.description}`,
            outline.difficulty,
            i
          );

          // Check if this module would benefit from visual aids
          let usesVisualAids = false;
          try {
            usesVisualAids = await shouldUseVisualAids(moduleOutline.title, moduleOutline.description);
          } catch (visualError) {
            // Non-critical - continue without flag
          }

          moduleItems.push({
            path_id: newPath.id,
            lab_id: null,
            order_index: i,
            title: moduleOutline.title,
            description: moduleOutline.description,
            item_type: 'module',
            status: 'not-started',
            content_mode: 'ai_generated',
            content_data: content,
            uses_visual_aids: usesVisualAids
          });
        }

        if (stream) {
          res.write(`data: ${JSON.stringify({ type: 'module_complete', title: moduleOutline.title, index: i })}\n\n`);
        }
      } catch (error) {
        console.error(`[Generate] Failed to generate: "${moduleOutline.title}"`);
        moduleItems.push({
          path_id: newPath.id,
          lab_id: null,
          order_index: i,
          title: moduleOutline.title,
          description: moduleOutline.description,
          item_type: 'module',
          status: 'not-started',
          content_mode: learnByDoingEnabled ? 'learn_by_doing' : 'ai_generated',
          content_data: learnByDoingEnabled ? { prompt: buildLearnByDoingPrompt(moduleOutline) } : null
        });
      }
    }

    // Interleave with labs
    const allPathItems: any[] = [];
    let orderIndex = 0;
    for (let i = 0; i < moduleItems.length; i++) {
      allPathItems.push({ ...moduleItems[i], order_index: orderIndex++ });
      if (i < moduleItems.length - 1) {
        allPathItems.push({
          path_id: newPath.id,
          lab_id: null,
          order_index: orderIndex++,
          title: `Practice Lab: ${moduleItems[i].title}`,
          description: `Apply what you learned through hands-on practice.`,
          item_type: 'lab',
          status: 'not-started',
          content_mode: 'ai_generated',
          content_data: { suggested: true, module_context: moduleItems[i].title }
        });
      }
    }

    // Insert items
    if (allPathItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("learning_path_items")
        .insert(allPathItems);

      if (itemsError) {
        throw new Error(`Failed to create items: ${itemsError.message}`);
      }
    }

    console.log(`[Generate] ✅ AI-generated path complete!`);

    // Update dashboard
    try {
      await updateDashboardActivity(userId, {
        activityType: 'path_started',
        topics: outline.topics || [],
        minutes: 0,
      });
    } catch (e) { /* ignore */ }

    // Fetch complete path
    const { data: completePath } = await supabase
      .from("learning_paths")
      .select(`*, learning_path_items (*)`)
      .eq("id", newPath.id)
      .single();

    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'completed', path: completePath, content_mode: 'ai_generated' })}\n\n`);
      res.end();
      return;
    }

    return res.status(201).json({ ...completePath, content_mode: 'ai_generated' });

  } catch (error) {
    console.error("[Generate] Error:", error);
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.end();
      return;
    }
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI-generate learning path with registry-backed modules
// Modules are grounded in Source Registry, Labs remain AI-generated
router.post("/generate-registry", async (req: Request, res: Response) => {
  const stream = req.query.stream === 'true';

  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      title,
      description,
      estimatedDuration,
      topics,
      source_asset_id // Optional - if not provided, will auto-discover from OpenStax
    } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
    }

    const groundingService = new ModuleGroundingService(supabase);
    const dynamicFetcher = new DynamicSourceFetcher(supabase);

    let asset: any;
    let tocSummaries: any[];
    let actualAssetId: string;

    if (source_asset_id) {
      // Use provided asset ID
      console.log(`[Registry] Using provided source_asset_id: ${source_asset_id}`);
      logger.info('paths', `Using provided source_asset_id: ${source_asset_id}`);
      
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Loading source asset from registry...' })}\n\n`);
      }
      
      asset = await groundingService.getAsset(source_asset_id);
      if (!asset) {
        return res.status(404).json({ error: "Source asset not found" });
      }
      if (!asset.active) {
        return res.status(400).json({ error: "Source asset is not active" });
      }

      console.log(`[Registry] Found asset: "${asset.title}"`);
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'status', message: `Found source: ${asset.title}` })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Loading table of contents from registry...' })}\n\n`);
      }

      tocSummaries = await groundingService.getTocSummaries(source_asset_id);
      if (tocSummaries.length === 0) {
        return res.status(400).json({ error: "Source asset has no TOC nodes" });
      }
      
      console.log(`[Registry] Loaded ${tocSummaries.length} TOC nodes from registry`);
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'status', message: `Loaded ${tocSummaries.length} sections from table of contents` })}\n\n`);
      }
      
      actualAssetId = source_asset_id;
    } else {
      // Auto-discover content from OpenStax based on topic
      console.log(`[Registry] Auto-discovering content for topic: "${description}"`);
      logger.info('paths', `Auto-discovering content for topic: "${description}"`);
      
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Searching OpenStax catalog for relevant textbooks...' })}\n\n`);
      }

      // Build search query from description and topics
      const searchQuery = [description, ...(topics || [])].join(' ');
      console.log(`[Registry] Search query: "${searchQuery}"`);
      
      // First, fetch the OpenStax catalog
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Fetching OpenStax book catalog from API...' })}\n\n`);
      }
      
      const books = await dynamicFetcher.getOpenStaxBooks();
      console.log(`[Registry] OpenStax catalog loaded: ${books.length} books available`);
      
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'status', message: `Found ${books.length} OpenStax textbooks. Searching for best match...` })}\n\n`);
      }
      
      // Search for matching books
      const searchResults = await dynamicFetcher.searchBooksByTopic(searchQuery);
      
      if (searchResults.length === 0) {
        console.log(`[Registry] No matching books found for: "${searchQuery}"`);
        logger.warn('paths', `No OpenStax content found for: "${searchQuery}"`);
        
        if (stream) {
          res.write(`data: ${JSON.stringify({ 
            type: 'warning', 
            message: '❌ No matching OpenStax content found. Consider using /generate for AI-generated content.',
            searchQuery
          })}\n\n`);
        }
        
        return res.status(404).json({ 
          error: "No matching OpenStax content found for this topic",
          suggestion: "Use POST /paths/generate for AI-generated content, or try a more specific topic",
          searchQuery
        });
      }

      const bestMatch = searchResults[0];
      console.log(`[Registry] Best match: "${bestMatch.book.title}" (score: ${bestMatch.score}, matched: ${bestMatch.matchedTerms.join(', ')})`);
      
      if (stream) {
        res.write(`data: ${JSON.stringify({ 
          type: 'status', 
          message: `✅ Best match: "${bestMatch.book.title}" (matched terms: ${bestMatch.matchedTerms.join(', ')})`
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'status', message: '💾 Creating/loading asset in registry...' })}\n\n`);
      }
      
      // Get or create the asset in the database
      asset = await dynamicFetcher.getOrCreateAsset(bestMatch.book);
      actualAssetId = asset.id;
      
      console.log(`[Registry] Asset ID: ${asset.id} (${asset.title})`);
      
      if (stream) {
        res.write(`data: ${JSON.stringify({ 
          type: 'source_discovered', 
          source: { 
            id: asset.id, 
            title: asset.title, 
            description: asset.description,
            url: bestMatch.book.url
          }
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Fetching table of contents from OpenStax...' })}\n\n`);
      }
      
      // Get TOC (will fetch from OpenStax if not cached)
      tocSummaries = await dynamicFetcher.getTocSummaries(asset);
      
      console.log(`[Registry] TOC loaded: ${tocSummaries.length} nodes`);
      
      if (tocSummaries.length === 0) {
        console.log(`[Registry] ERROR: Failed to get TOC for ${asset.title}`);
        logger.error('paths', `Failed to get TOC for ${asset.title}`);
        
        if (stream) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to fetch table of contents from OpenStax' })}\n\n`);
        }
        return res.status(500).json({ error: "Failed to fetch table of contents from source" });
      }

      if (stream) {
        res.write(`data: ${JSON.stringify({ 
          type: 'status', 
          message: `📑 Loaded ${tocSummaries.length} sections from "${asset.title}"`
        })}\n\n`);
      }

      logger.info('paths', `Auto-discovered: ${asset.title} with ${tocSummaries.length} TOC nodes`);
    }

    // Get user's difficulty level
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_data")
      .eq("id", userId)
      .single();

    const experienceMap: Record<string, 'intro' | 'intermediate' | 'advanced'> = {
      'new': 'intro',
      'familiar': 'intermediate',
      'comfortable': 'advanced'
    };

    const experience = profile?.onboarding_data?.workPreferences?.experience;
    const difficulty = experience ? (experienceMap[experience] || 'intermediate') : 'intermediate';

    console.log(`[Registry] Starting path generation with ${tocSummaries.length} TOC nodes`);
    logger.info('paths', `Generating registry-backed path`, {
      details: { userId, assetId: actualAssetId, tocNodes: tocSummaries.length }
    });

    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: '🤖 AI is analyzing source content and generating path outline...' })}\n\n`);
    }

    // Generate registry-aware outline
    console.log(`[Registry] Calling AI to generate outline based on TOC...`);
    const { outline, moduleNodeMappings } = await generateRegistryBackedPath(
      {
        title: title || "",
        description,
        difficulty,
        estimatedDuration,
        topics,
        source_asset_id: actualAssetId
      },
      tocSummaries,
      asset.title
    );

    console.log(`[Registry] Outline generated: "${outline.title}" with ${outline.modules.length} modules`);
    logger.info('paths', `Outline generated: ${outline.modules.length} modules`, {
      details: { pathTitle: outline.title }
    });

    if (stream) {
      res.write(`data: ${JSON.stringify({ 
        type: 'status', 
        message: `✨ Generated outline: "${outline.title}" with ${outline.modules.length} modules`
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'outline', outline })}\n\n`);
    }
    
    // Log module-to-node mappings
    console.log(`[Registry] Module-to-TOC node mappings:`);
    for (const [moduleIndex, nodeIds] of moduleNodeMappings) {
      const moduleName = outline.modules.find(m => m.order_index === moduleIndex)?.title || `Module ${moduleIndex}`;
      console.log(`  - ${moduleName}: ${nodeIds.length} source nodes`);
    }

    // Create the learning path
    const { data: newPath, error: pathError } = await supabase
      .from("learning_paths")
      .insert([
        {
          user_id: userId,
          title: outline.title,
          description: outline.description,
          topics: outline.topics,
          difficulty: outline.difficulty,
          estimated_duration: outline.estimated_duration * 60,
          status: "not-started",
          progress: 0
        }
      ])
      .select()
      .single();

    if (pathError) {
      console.error("[Registry] Error creating learning path:", pathError);
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to create learning path' })}\n\n`);
        res.end();
        return;
      }
      return res.status(500).json({ error: "Failed to create learning path" });
    }

    console.log(`[Registry] Path saved to database with ID: ${newPath.id}`);
    logger.info('paths', `Path created: ${newPath.id}`);
    
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: '💾 Path saved to database. Creating modules...' })}\n\n`);
    }

    // Create registry-backed module items
    const allPathItems: any[] = [];
    let currentOrderIndex = 0;
    let modulesWithContent = 0;
    let modulesWithoutContent = 0;

    console.log(`[Registry] Creating ${outline.modules.length} registry-backed modules...`);
    
    for (const moduleOutline of outline.modules) {
      const nodeIds = moduleNodeMappings.get(moduleOutline.order_index) || [];
      const contentUnavailable = nodeIds.length === 0;
      
      if (contentUnavailable) {
        modulesWithoutContent++;
        console.log(`[Registry] Module "${moduleOutline.title}": ⚠️ No matching source nodes found`);
      } else {
        modulesWithContent++;
        console.log(`[Registry] Module "${moduleOutline.title}": ✓ Mapped to ${nodeIds.length} source nodes`);
      }

      if (stream) {
        res.write(`data: ${JSON.stringify({ 
          type: 'module_mapping', 
          title: moduleOutline.title, 
          index: moduleOutline.order_index,
          nodeCount: nodeIds.length,
          hasContent: !contentUnavailable,
          message: contentUnavailable 
            ? `⚠️ "${moduleOutline.title}" - No matching source sections found`
            : `✓ "${moduleOutline.title}" - Mapped to ${nodeIds.length} source sections`
        })}\n\n`);
      }

      // Generate module content now if we have source nodes
      let moduleContent = null;
      if (!contentUnavailable) {
        try {
          if (stream) {
            res.write(`data: ${JSON.stringify({ 
              type: 'status', 
              message: `🎨 Generating "${moduleOutline.title}" from source material...`
            })}\n\n`);
          }

          console.log(`[Registry] Generating content for "${moduleOutline.title}"...`);
          
          // Step 1: Synthesize from source
          const renderedContent = await groundingService.renderModuleContent(
            '', // No item ID yet
            moduleOutline.title,
            moduleOutline.description,
            actualAssetId,
            nodeIds,
            outline.difficulty || 'intermediate'
          );

          console.log(`[Registry] Synthesized ${renderedContent.sections.length} sections`);

          // Check if source content is unavailable or insufficient
          if (renderedContent.unavailable_reason) {
            console.log(`[Registry] ⚠️ Source content unavailable: ${renderedContent.unavailable_reason}`);
            console.log(`[Registry] Falling back to AI-only generation for "${moduleOutline.title}"`);
            
            // Fall back to AI-only generation
            moduleContent = await generateModuleContent(
              moduleOutline.title,
              moduleOutline.description,
              `${outline.title}: ${outline.description}`,
              outline.difficulty || 'intermediate',
              moduleOutline.order_index
            );
          } else {
            // Step 2: Generate full structured module from source
            moduleContent = await generateModuleFromSourceContent(
              moduleOutline.title,
              moduleOutline.description,
              `${outline.title}: ${outline.description}`,
              outline.difficulty || 'intermediate',
              {
                overview: renderedContent.overview,
                learning_objectives: renderedContent.learning_objectives,
                sections: renderedContent.sections,
                key_concepts: renderedContent.key_concepts
              }
            );
          }

          console.log(`[Registry] ✓ Generated module with ${moduleContent.chapters?.length || 0} chapters`);
          
          if (stream) {
            res.write(`data: ${JSON.stringify({ 
              type: 'module_complete', 
              title: moduleOutline.title,
              chaptersCount: moduleContent.chapters?.length || 0
            })}\n\n`);
          }
        } catch (error) {
          console.error(`[Registry] Failed to generate "${moduleOutline.title}":`, error);
          moduleContent = null;
        }
      }

      // Create registry-backed module with content
      allPathItems.push({
        path_id: newPath.id,
        lab_id: null,
        order_index: currentOrderIndex++,
        title: moduleOutline.title,
        description: moduleOutline.description,
        item_type: 'module' as const,
        status: 'not-started',
        content_mode: 'registry_backed',
        source_asset_id: actualAssetId,
        source_node_ids: nodeIds,
        content_unavailable: contentUnavailable,
        last_resolved_at: new Date().toISOString(),
        content_data: moduleContent
      });

      // Add lab suggestion after each module (except the last)
      if (moduleOutline.order_index < outline.modules.length - 1) {
        allPathItems.push({
          path_id: newPath.id,
          lab_id: null,
          order_index: currentOrderIndex++,
          title: `Practice Lab: ${moduleOutline.title}`,
          description: `Apply what you learned in "${moduleOutline.title}" through hands-on practice.`,
          item_type: 'lab' as const,
          status: 'not-started',
          content_mode: 'ai_generated', // Labs remain AI-generated
          content_data: {
            suggested: true,
            module_context: moduleOutline.title
          }
        });
      }
    }
    
    if (modulesWithContent === 0) {
      console.log(`[Registry] No registry sections mapped to any module. Falling back to AI-generated content.`);
      throw new Error('NO_REGISTRY_CONTENT_FOUND');
    }
    
    console.log(`[Registry] Module summary: ${modulesWithContent} with content, ${modulesWithoutContent} without content`);
    
    if (stream) {
      res.write(`data: ${JSON.stringify({ 
        type: 'status', 
        message: `📊 Module mapping complete: ${modulesWithContent}/${outline.modules.length} modules have source content`
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'status', message: '💾 Saving modules to database...' })}\n\n`);
    }

    // Insert all path items
    if (allPathItems.length > 0) {
      console.log(`[Registry] Inserting ${allPathItems.length} items to database...`);
      
      const { data: insertedItems, error: itemsError } = await supabase
        .from("learning_path_items")
        .insert(allPathItems)
        .select();

      if (itemsError) {
        console.error("[Registry] Error creating path items:", itemsError);
        if (stream) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to create path items' })}\n\n`);
          res.end();
          return;
        }
        return res.status(500).json({ error: "Failed to create path items" });
      }

      console.log(`[Registry] Successfully saved ${insertedItems?.length || 0} path items to database`);
      logger.info('paths', `Created ${insertedItems?.length || 0} path items`);
      
      if (stream) {
        res.write(`data: ${JSON.stringify({ 
          type: 'status', 
          message: `✅ Saved ${insertedItems?.length || 0} items to database`
        })}\n\n`);
      }
    }

    // Update dashboard
    try {
      await updateDashboardActivity(userId, {
        activityType: 'path_started',
        topics: outline.topics || [],
        minutes: 0,
      });
    } catch (dashError) {
      console.error('Error updating dashboard:', dashError);
    }

    // Fetch the complete path
    const { data: completePath, error: fetchError } = await supabase
      .from("learning_paths")
      .select(`
        *,
        learning_path_items (
          id,
          lab_id,
          order_index,
          title,
          description,
          item_type,
          status,
          completed_at,
          content_mode,
          source_asset_id,
          source_node_ids,
          content_unavailable,
          last_resolved_at
        )
      `)
      .eq("id", newPath.id)
      .single();

    if (fetchError) {
      console.error("[Registry] Error fetching complete path:", fetchError);
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to fetch complete path' })}\n\n`);
        res.end();
        return;
      }
      return res.status(500).json({ error: "Failed to fetch complete path" });
    }

    console.log(`[Registry] ✅ Path generation complete!`);
    console.log(`[Registry] Summary:`);
    console.log(`  - Path: "${completePath.title}" (ID: ${completePath.id})`);
    console.log(`  - Source: "${asset.title}"`);
    console.log(`  - Modules: ${outline.modules.length} (${modulesWithContent} with source content)`);
    console.log(`  - Labs: ${outline.modules.length - 1} suggested`);
    console.log(`  - Content Mode: registry_backed`);

    if (stream) {
      res.write(`data: ${JSON.stringify({ 
        type: 'status', 
        message: `🎉 Path generation complete! "${completePath.title}" is ready.`
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ 
        type: 'summary',
        pathId: completePath.id,
        pathTitle: completePath.title,
        sourceTitle: asset.title,
        sourceId: asset.id,
        modulesTotal: outline.modules.length,
        modulesWithContent: modulesWithContent,
        modulesWithoutContent: modulesWithoutContent,
        contentMode: 'registry_backed'
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'completed', path: completePath, source_asset: asset })}\n\n`);
      res.end();
      return;
    }

    return res.status(201).json({ ...completePath, source_asset: asset });

  } catch (error) {
    console.error("Error in POST /paths/generate-registry:", error);
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.end();
      return;
    }
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update learning path
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const updates = req.body;

    const { data: updatedPath, error } = await supabase
      .from("learning_paths")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating learning path:", error);
      return res.status(500).json({ error: "Failed to update learning path" });
    }

    return res.json(updatedPath);
  } catch (error) {
    console.error("Error in PATCH /paths/:id:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete learning path
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from("learning_paths")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting learning path:", error);
      return res.status(500).json({ error: "Failed to delete learning path" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error in DELETE /paths/:id:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update path item status
// Get single path item
router.get("/:pathId/items/:itemId", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { pathId, itemId } = req.params;

    // Verify the path belongs to the user
    const { data: path } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", pathId)
      .eq("user_id", userId)
      .single();

    if (!path) {
      return res.status(404).json({ error: "Learning path not found" });
    }

    // Fetch the item with its content_data
    const { data: item, error } = await supabase
      .from("learning_path_items")
      .select(`
        *,
        labs (
          id,
          title,
          description,
          status,
          difficulty,
          estimated_duration
        )
      `)
      .eq("id", itemId)
      .eq("path_id", pathId)
      .single();

    if (error || !item) {
      console.error("Error fetching path item:", error);
      return res.status(404).json({ error: "Path item not found" });
    }

    return res.json(item);
  } catch (error) {
    console.error("Error in GET /paths/:pathId/items/:itemId:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Render module content on-demand (for registry-backed modules)
router.get("/:pathId/items/:itemId/render", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { pathId, itemId } = req.params;

    // Verify the path belongs to the user
    const { data: path } = await supabase
      .from("learning_paths")
      .select("id, difficulty")
      .eq("id", pathId)
      .eq("user_id", userId)
      .single();

    if (!path) {
      return res.status(404).json({ error: "Learning path not found" });
    }

    // Fetch the item
    const { data: item, error: itemError } = await supabase
      .from("learning_path_items")
      .select("*")
      .eq("id", itemId)
      .eq("path_id", pathId)
      .single();

    if (itemError || !item) {
      console.error("Error fetching path item:", itemError);
      return res.status(404).json({ error: "Path item not found" });
    }

    // Check if this is a module
    if (item.item_type !== 'module') {
      return res.status(400).json({ error: "Only modules can be rendered. Labs should use the lab system." });
    }

    // For ai_generated modules, return the existing content_data
    if (item.content_mode === 'ai_generated' || !item.content_mode) {
      if (item.content_data) {
        return res.json({
          content: item.content_data,
          content_mode: 'ai_generated',
          citations: [],
          rendered_at: item.updated_at
        });
      } else {
        return res.status(404).json({ error: "Module content not available" });
      }
    }

    if (item.content_mode === 'learn_by_doing') {
      if (item.content_data) {
        return res.json({
          content: item.content_data,
          content_mode: 'learn_by_doing',
          citations: [],
          rendered_at: item.updated_at
        });
      }
      return res.status(404).json({ error: "Learn-by-doing content not available" });
    }

    // For registry_backed modules, render on-demand
    if (item.content_mode === 'registry_backed') {
      const groundingService = new ModuleGroundingService(supabase);

      // Check if content is unavailable
      if (item.content_unavailable) {
        return res.json({
          content: {
            overview: 'No source content is available for this module. The requested topic may not be covered in the selected source material.',
            learning_objectives: [],
            sections: [],
            key_concepts: []
          },
          content_mode: 'registry_backed',
          content_unavailable: true,
          citations: [],
          rendered_at: new Date().toISOString()
        });
      }

      // Verify we have source nodes
      if (!item.source_asset_id || !item.source_node_ids || item.source_node_ids.length === 0) {
        return res.json({
          content: {
            overview: 'This module has no source material mapped. Please regenerate the learning path.',
            learning_objectives: [],
            sections: [],
            key_concepts: []
          },
          content_mode: 'registry_backed',
          content_unavailable: true,
          citations: [],
          rendered_at: new Date().toISOString()
        });
      }

      logger.info('paths', `Rendering registry-backed module: ${item.title}`, {
        details: {
          moduleId: itemId,
          assetId: item.source_asset_id,
          nodeCount: item.source_node_ids.length
        }
      });

      try {
        // Render the content
        const renderedContent = await groundingService.renderModuleContent(
          itemId,
          item.title,
          item.description || '',
          item.source_asset_id,
          item.source_node_ids,
          path.difficulty || 'intermediate'
        );

        // Get citation display string
        const citationDisplay = await groundingService.getModuleCitationDisplay(
          item.source_asset_id,
          item.source_node_ids
        );

        // Get registry node titles for visual enrichment
        const tocNodes = await groundingService.getTocNodesForModule(
          item.source_asset_id,
          item.source_node_ids
        );
        const registryNodeTitles = tocNodes.map((n: any) => n.title || '').filter(Boolean);

        // Enrich with visual aids (non-blocking, graceful degradation)
        let illustrativeVisuals: any[] = [];
        try {
          const visualRequest: GenerateVisualIntentRequest = {
            module_title: item.title,
            explanation_text: renderedContent.overview || '',
            registry_node_titles: registryNodeTitles,
            learning_objectives: renderedContent.learning_objectives,
            key_concepts: renderedContent.key_concepts?.map((c: any) => c.concept) || [],
          };

          const visualEnrichment = await enrichModuleWithVisuals(visualRequest);
          
          if (visualEnrichment.has_visuals) {
            illustrativeVisuals = formatVisualsForFrontend(visualEnrichment.visual_aids);
            logger.info('paths', `Visual enrichment added ${illustrativeVisuals.length} visuals to module: ${item.title}`);
          }
        } catch (visualError) {
          // Visual enrichment is supplemental - don't fail module rendering
          logger.warn('paths', `Visual enrichment failed for module: ${item.title}`, {
            details: { error: (visualError as Error).message }
          });
        }

        logger.info('paths', `Module rendered successfully: ${item.title}`, {
          details: {
            sectionsCount: renderedContent.sections.length,
            citationsCount: renderedContent.citations.length,
            illustrativeVisualsCount: illustrativeVisuals.length
          }
        });

        return res.json({
          content: {
            overview: renderedContent.overview,
            learning_objectives: renderedContent.learning_objectives,
            sections: renderedContent.sections,
            key_concepts: renderedContent.key_concepts,
            figures: renderedContent.figures,
            illustrative_visuals: illustrativeVisuals, // NEW: Visual aids with usage_label = "illustrative"
          },
          content_mode: 'registry_backed',
          content_unavailable: renderedContent.content_unavailable,
          unavailable_reason: renderedContent.unavailable_reason,
          citations: renderedContent.citations,
          citation_display: citationDisplay,
          rendered_at: renderedContent.rendered_at
        });

      } catch (renderError) {
        console.error("Error rendering module content:", renderError);
        logger.error('paths', `Module render failed: ${(renderError as Error).message}`, {
          details: { moduleId: itemId }
        });

        return res.status(500).json({
          error: "Failed to render module content",
          details: renderError instanceof Error ? renderError.message : 'Unknown error'
        });
      }
    }

    return res.status(400).json({ error: "Invalid content mode" });

  } catch (error) {
    console.error("Error in GET /paths/:pathId/items/:itemId/render:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:pathId/items/:itemId", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { pathId, itemId } = req.params;
    const { status, progress_data, lab_id } = req.body;

    if (!status && !progress_data && !lab_id) {
      return res.status(400).json({ error: "Status, progress_data, or lab_id is required" });
    }

    // Verify the path belongs to the user
    const { data: path } = await supabase
      .from("learning_paths")
      .select("id, topics, estimated_duration")
      .eq("id", pathId)
      .eq("user_id", userId)
      .single();

    if (!path) {
      return res.status(404).json({ error: "Learning path not found" });
    }

    // Build update data
    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    
    if (progress_data) {
      updateData.progress_data = progress_data;
    }
    
    if (lab_id) {
      updateData.lab_id = lab_id;
    }

    const { data: updatedItem, error } = await supabase
      .from("learning_path_items")
      .update(updateData)
      .eq("id", itemId)
      .eq("path_id", pathId)
      .select()
      .single();

    if (error) {
      console.error("Error updating path item:", error);
      return res.status(500).json({ error: "Failed to update path item" });
    }

    // Check if module just completed and send notification
    const wasJustCompleted = updatedItem.status === 'completed' && 
      (status === 'completed' || 
       (progress_data && 
        progress_data.reading_completed && 
        (progress_data.examples_completed || progress_data.visuals_completed)));
    
    if (wasJustCompleted) {
      try {
        await createModuleCompletionNotification(
          userId,
          itemId,
          updatedItem.title,
          pathId
        );
      } catch (notifError) {
        console.error('Error creating module completion notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    // Check if the entire path is completed
    const { data: allItems } = await supabase
      .from("learning_path_items")
      .select("status")
      .eq("path_id", pathId);

    const allCompleted = allItems?.every(item => item.status === 'completed');

    if (allCompleted) {
      const { data: pathData } = await supabase
        .from("learning_paths")
        .select("title")
        .eq("id", pathId)
        .single();

      await supabase
        .from("learning_paths")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString(),
          progress: 100
        })
        .eq("id", pathId);

      // Send path completion notification
      try {
        await createPathCompletionNotification(
          userId,
          pathId,
          pathData?.title || 'Learning Path'
        );
      } catch (notifError) {
        console.error('Error creating path completion notification:', notifError);
      }

      // Update dashboard with path completion
      try {
        await updateDashboardActivity(userId, {
          activityType: 'path_completed',
          topics: path.topics || [],
          minutes: path.estimated_duration || 0,
          successRate: 100,
        });
      } catch (dashError) {
        console.error('Error updating dashboard:', dashError);
      }
    }

    return res.json(updatedItem);
  } catch (error) {
    console.error("Error in PATCH /paths/:pathId/items/:itemId:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Add item to learning path
router.post("/:pathId/items", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { pathId } = req.params;
    const { lab_id, title, description, item_type, order_index } = req.body;

    // Verify the path belongs to the user
    const { data: path } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", pathId)
      .eq("user_id", userId)
      .single();

    if (!path) {
      return res.status(404).json({ error: "Learning path not found" });
    }

    // Get the next order index if not provided
    let nextOrderIndex = order_index;
    if (nextOrderIndex === undefined) {
      const { data: items } = await supabase
        .from("learning_path_items")
        .select("order_index")
        .eq("path_id", pathId)
        .order("order_index", { ascending: false })
        .limit(1);

      nextOrderIndex = items && items.length > 0 ? items[0].order_index + 1 : 0;
    }

    const { data: newItem, error } = await supabase
      .from("learning_path_items")
      .insert([
        {
          path_id: pathId,
          lab_id,
          title: title || 'New Item',
          description,
          item_type: item_type || 'lab',
          order_index: nextOrderIndex,
          status: 'not-started'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating path item:", error);
      return res.status(500).json({ error: "Failed to create path item" });
    }

    return res.status(201).json(newItem);
  } catch (error) {
    console.error("Error in POST /paths/:pathId/items:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete path item
router.delete("/:pathId/items/:itemId", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { pathId, itemId } = req.params;

    // Verify the path belongs to the user
    const { data: path } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("id", pathId)
      .eq("user_id", userId)
      .single();

    if (!path) {
      return res.status(404).json({ error: "Learning path not found" });
    }

    const { error } = await supabase
      .from("learning_path_items")
      .delete()
      .eq("id", itemId)
      .eq("path_id", pathId);

    if (error) {
      console.error("Error deleting path item:", error);
      return res.status(500).json({ error: "Failed to delete path item" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error in DELETE /paths/:pathId/items/:itemId:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
