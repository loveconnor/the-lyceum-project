import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../supabaseAdmin";
import { updateDashboardActivity } from "../dashboardService";

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
router.patch("/:pathId/items/:itemId", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { pathId, itemId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
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

    // Update the item
    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
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

    // Check if the entire path is completed
    const { data: allItems } = await supabase
      .from("learning_path_items")
      .select("status")
      .eq("path_id", pathId);

    const allCompleted = allItems?.every(item => item.status === 'completed');

    if (allCompleted) {
      await supabase
        .from("learning_paths")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString(),
          progress: 100
        })
        .eq("id", pathId);

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
