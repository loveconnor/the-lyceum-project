import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../supabaseAdmin";
import { updateDashboardActivity } from "../dashboardService";
import { generatePathOutline, generateModuleContent } from "../ai-path-generator";
import { 
  createModuleCompletionNotification, 
  createPathCompletionNotification 
} from "../notificationService";

const router = Router();

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

    return res.json(paths);
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
router.post("/generate", async (req: Request, res: Response) => {
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
      topics
    } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Description is required" });
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

    // Map experience level from onboarding to difficulty
    const experienceMap: Record<string, 'intro' | 'intermediate' | 'advanced'> = {
      'new': 'intro',
      'familiar': 'intermediate',
      'comfortable': 'advanced'
    };

    const experience = profile?.onboarding_data?.workPreferences?.experience;
    const difficulty = experience ? (experienceMap[experience] || 'intermediate') : 'intermediate';

    console.log(`Using difficulty level: ${difficulty} (from user experience: ${experience || 'not set'})`);

    // Generate path and modules using AI
    console.log('Step 1: Generating learning path outline from description:', description);
    const outline = await generatePathOutline({
      title: title || "", // Allow empty title - AI will generate it
      description,
      difficulty,
      estimatedDuration,
      topics
    });

    console.log(`Outline generated: ${outline.modules.length} modules planned`);

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
          estimated_duration: outline.estimated_duration * 60, // Convert hours to minutes
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

    console.log(`Path created: ${newPath.id}`);

    // Helper function to limit concurrency
    const generateModulesWithConcurrencyLimit = async (
      modules: typeof outline.modules,
      limit: number = 3
    ) => {
      const results: any[] = [];
      
      for (let i = 0; i < modules.length; i += limit) {
        const batch = modules.slice(i, i + limit);
        console.log(`Generating batch ${Math.floor(i / limit) + 1}: ${batch.map(m => m.title).join(', ')}`);
        
        const batchPromises = batch.map(async (moduleOutline, batchIndex) => {
          const moduleIndex = i + batchIndex;
          console.log(`Starting module generation: "${moduleOutline.title}"...`);
          
          try {
            const content = await generateModuleContent(
              moduleOutline.title,
              moduleOutline.description,
              `${outline.title}: ${outline.description}`,
              outline.difficulty,
              moduleIndex
            );

            console.log(`Module "${moduleOutline.title}" content generated successfully`);

            return {
              path_id: newPath.id,
              lab_id: null,
              order_index: moduleIndex,
              title: moduleOutline.title,
              description: moduleOutline.description,
              item_type: 'reading' as const,
              status: 'not-started',
              content_data: content
            };
          } catch (error) {
            console.error(`Error generating content for module "${moduleOutline.title}":`, error);
            // Return item with null content if generation fails
            return {
              path_id: newPath.id,
              lab_id: null,
              order_index: moduleIndex,
              title: moduleOutline.title,
              description: moduleOutline.description,
              item_type: 'reading' as const,
              status: 'not-started',
              content_data: null
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        console.log(`Batch ${Math.floor(i / limit) + 1} completed`);
      }
      
      return results;
    };

    // Generate content for modules in batches of 3 to avoid overwhelming the API
    console.log(`Generating content for ${outline.modules.length} modules (3 at a time)...`);
    const pathItems = await generateModulesWithConcurrencyLimit(outline.modules, 3);
    console.log(`All ${pathItems.length} modules generated`);

    // Create path items from generated modules
    if (pathItems.length > 0) {
      console.log(`Inserting ${pathItems.length} modules into database`);
      
      const { data: insertedItems, error: itemsError } = await supabase
        .from("learning_path_items")
        .insert(pathItems)
        .select();

      if (itemsError) {
        console.error("Error creating path items:", itemsError);
        return res.status(500).json({ error: "Failed to create modules" });
      }
      
      console.log(`Successfully created ${insertedItems?.length || 0} modules`);
    } else {
      console.log('No modules generated by AI');
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

    // Fetch the complete path with items
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
          content_data
        )
      `)
      .eq("id", newPath.id)
      .single();

    if (fetchError) {
      console.error("Error fetching complete path:", fetchError);
      return res.status(500).json({ error: "Failed to fetch complete path" });
    }

    return res.status(201).json(completePath);
  } catch (error) {
    console.error("Error in POST /paths/generate:", error);
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

router.patch("/:pathId/items/:itemId", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { pathId, itemId } = req.params;
    const { status, progress_data } = req.body;

    if (!status && !progress_data) {
      return res.status(400).json({ error: "Status or progress_data is required" });
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
