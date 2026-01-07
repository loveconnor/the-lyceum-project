import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../supabaseAdmin";
import { generateLab, getLabAIAssistance } from "../ai-lab-generator";
import { updateDashboardActivity } from "../dashboardService";

const router = Router();

// Get all labs for current user
router.get("/", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: labs, error } = await supabase
      .from("labs")
      .select(`
        *,
        lab_progress (
          id,
          step_id,
          step_data,
          completed,
          updated_at
        ),
        lab_comments (
          id,
          text,
          created_at
        ),
        learning_path_items!learning_path_items_lab_id_fkey (
          path_id,
          learning_paths (
            id,
            title
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching labs:", error);
      return res.status(500).json({ error: "Failed to fetch labs" });
    }

    // Transform the data to include path_id and path_title at the lab level
    const transformedLabs = labs?.map(lab => {
      const pathItem = lab.learning_path_items?.[0];
      const pathInfo = pathItem?.learning_paths;
      return {
        ...lab,
        path_id: pathInfo?.id || null,
        path_title: pathInfo?.title || null,
        learning_path_items: undefined // Remove the nested structure
      };
    }) || [];

    return res.json(transformedLabs);
  } catch (error) {
    console.error("Error in GET /labs:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get single lab with progress
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const { data: lab, error } = await supabase
      .from("labs")
      .select(`
        *,
        learning_path_items!learning_path_items_lab_id_fkey (
          path_id,
          learning_paths (
            id,
            title
          )
        )
      `)
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching lab:", error);
      return res.status(404).json({ error: "Lab not found" });
    }

    // Transform to include path info at lab level
    const pathItem = (lab as any).learning_path_items?.[0];
    const pathInfo = pathItem?.learning_paths;
    const transformedLab = {
      ...lab,
      path_id: pathInfo?.id || null,
      path_title: pathInfo?.title || null,
      learning_path_items: undefined
    };

    // Fetch progress
    const { data: progress } = await supabase
      .from("lab_progress")
      .select("*")
      .eq("lab_id", id)
      .order("updated_at", { ascending: false });

    // Fetch comments
    const { data: comments } = await supabase
      .from("lab_comments")
      .select("*")
      .eq("lab_id", id)
      .order("created_at", { ascending: true });

    return res.json({
      ...transformedLab,
      lab_progress: progress || [],
      lab_comments: comments || []
    });
  } catch (error) {
    console.error("Error in GET /labs/:id:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Generate lab with AI
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { learningGoal, context, userProfile, path_id } = req.body;

    if (!learningGoal) {
      return res.status(400).json({ error: "Learning goal is required" });
    }

    // If path_id is provided, fetch path details and previous modules to include as context
    let enrichedContext = context || '';
    if (path_id) {
      const supabase = getSupabaseAdmin();
      const { data: pathData, error: pathError } = await supabase
        .from('learning_paths')
        .select('title, description, topics, difficulty')
        .eq('id', path_id)
        .eq('user_id', userId)
        .single();
      
      if (pathData && !pathError) {
        // Fetch all modules in the path to understand what content has been covered
        const { data: pathItems, error: itemsError } = await supabase
          .from('learning_path_items')
          .select('title, description, order_index, item_type, content_data, status')
          .eq('path_id', path_id)
          .order('order_index', { ascending: true });
        
        // Build context about covered content
        let coveredTopicsContext = '';
        if (pathItems && !itemsError && pathItems.length > 0) {
          const completedModules = pathItems.filter((item: any) => 
            item.item_type === 'module' && item.status === 'completed' && item.content_data
          );
          
          if (completedModules.length > 0) {
            const topicsSummary: string[] = [];
            completedModules.forEach((module: any) => {
              const content = module.content_data;
              // Extract key concepts and learning objectives
              if (content.learning_objectives) {
                topicsSummary.push(`Module "${module.title}": ${content.learning_objectives.join(', ')}`);
              } else if (content.key_concepts) {
                const concepts = content.key_concepts.map((kc: any) => kc.concept || kc).join(', ');
                topicsSummary.push(`Module "${module.title}": ${concepts}`);
              } else {
                topicsSummary.push(`Module "${module.title}": ${module.description || ''}`);
              }
            });
            
            coveredTopicsContext = `\n\nCONCEPTS COVERED IN PREVIOUS MODULES (you MUST only use concepts from this list):\n${topicsSummary.join('\n')}\n\nIMPORTANT: Only create labs that use concepts, techniques, and knowledge from the modules listed above. Do not introduce new concepts or assume knowledge of topics not yet covered in this learning path.`;
          }
        }
        
        // Prepend path context to any existing context
        const pathContext = `This lab is part of the learning path "${pathData.title}"${pathData.description ? `: ${pathData.description}` : ''}${pathData.topics?.length ? `. Path topics: ${pathData.topics.join(', ')}` : ''}${pathData.difficulty ? `. Difficulty level: ${pathData.difficulty}` : ''}. Please ensure the lab aligns with the path's subject matter, programming language, and difficulty level.${coveredTopicsContext}`;
        enrichedContext = enrichedContext ? `${pathContext}\n\n${enrichedContext}` : pathContext;
        console.log('Enriched lab context with path and covered topics:', pathContext);
      } else if (pathError) {
        console.warn('Failed to fetch path context:', pathError);
      }
    }

    // Generate the lab using AI
    const generatedLab = await generateLab({
      learningGoal,
      context: enrichedContext,
      userProfile,
      path_id,
    });

    // Save to database
    const supabase = getSupabaseAdmin();
    const { data: newLab, error } = await supabase
      .from("labs")
      .insert([
        {
          user_id: userId,
          title: generatedLab.title,
          description: generatedLab.description,
          template_type: generatedLab.template_type,
          template_data: generatedLab.template_data,
          difficulty: generatedLab.difficulty,
          estimated_duration: generatedLab.estimated_duration,
          topics: generatedLab.topics,
          status: "not-started",
          starred: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error saving generated lab:", error);
      return res.status(500).json({ error: "Failed to save lab" });
    }

    return res.status(201).json(newLab);
  } catch (error) {
    console.error("Error in POST /labs/generate:", error);
    return res.status(500).json({ error: (error as Error).message || "Internal server error" });
  }
});

// Create new lab (manual)
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
      template_type,
      template_data,
      difficulty,
      estimated_duration,
      topics,
      due_date
    } = req.body;

    if (!title || !template_type || !template_data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: newLab, error } = await supabase
      .from("labs")
      .insert([
        {
          user_id: userId,
          title,
          description,
          template_type,
          template_data,
          difficulty,
          estimated_duration,
          topics,
          due_date,
          status: "not-started",
          starred: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating lab:", error);
      return res.status(500).json({ error: "Failed to create lab" });
    }

    return res.status(201).json(newLab);
  } catch (error) {
    console.error("Error in POST /labs:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update lab
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const updates = req.body;

    const { data: updatedLab, error } = await supabase
      .from("labs")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating lab:", error);
      return res.status(500).json({ error: "Failed to update lab" });
    }

    return res.json(updatedLab);
  } catch (error) {
    console.error("Error in PATCH /labs/:id:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete lab
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from("labs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting lab:", error);
      return res.status(500).json({ error: "Failed to delete lab" });
    }

    // Update dashboard statistics after deletion
    try {
      await updateDashboardActivity(userId, {
        activityType: 'lab_deleted',
        topics: [],
        minutes: 0,
      });
    } catch (dashError) {
      console.error('Error updating dashboard after lab deletion:', dashError);
      // Don't fail the request if dashboard update fails
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error in DELETE /labs/:id:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Reset lab progress
router.post("/:id/reset", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    // Verify lab ownership
    const { data: lab, error: labError } = await supabase
      .from("labs")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (labError || !lab) {
      return res.status(404).json({ error: "Lab not found" });
    }

    // Delete all progress for this lab
    const { error: deleteError } = await supabase
      .from("lab_progress")
      .delete()
      .eq("lab_id", id)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error resetting lab progress:", deleteError);
      return res.status(500).json({ error: "Failed to reset lab progress" });
    }

    // Reset lab status to not-started
    const { data: updatedLab, error: updateError } = await supabase
      .from("labs")
      .update({ status: "not-started", completed_at: null })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error resetting lab status:", updateError);
      return res.status(500).json({ error: "Failed to reset lab status" });
    }

    return res.json(updatedLab);
  } catch (error) {
    console.error("Error in POST /labs/:id/reset:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update lab progress
router.post("/:id/progress", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { step_id, step_data, completed } = req.body;

    if (!step_id) {
      return res.status(400).json({ error: "step_id is required" });
    }

    // Basic UUID validation for lab id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: "Invalid lab ID format" });
    }

    // Use upsert for better reliability and to avoid race conditions
    const { error } = await supabase
      .from("lab_progress")
      .upsert({
        lab_id: id,
        user_id: userId,
        step_id,
        step_data,
        completed,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lab_id,user_id,step_id'
      });

    if (error) {
      console.error("Error saving progress:", error);
      return res.status(500).json({ error: "Failed to save progress: " + error.message });
    }

    // Update lab status to 'in-progress' if this is the first progress entry
    const { data: labData } = await supabase
      .from("labs")
      .select("status")
      .eq("id", id)
      .single();

    if (labData && labData.status === "not-started") {
      await supabase
        .from("labs")
        .update({ status: "in-progress" })
        .eq("id", id);

      // Update dashboard when lab is started
      const { data: labInfo } = await supabase
        .from("labs")
        .select("topics, estimated_duration")
        .eq("id", id)
        .single();

      try {
        await updateDashboardActivity(userId, {
          activityType: 'lab_started',
          topics: labInfo?.topics || [],
          minutes: 0,
        });
      } catch (dashError) {
        console.error('Error updating dashboard:', dashError);
      }
    }

    // Check if all steps are completed and update lab status to 'completed'
    if (completed) {
      const { data: allProgress } = await supabase
        .from("lab_progress")
        .select("completed, step_id")
        .eq("lab_id", id)
        .eq("user_id", userId);

      // Get lab to check expected steps from template_data
      const { data: labData } = await supabase
        .from("labs")
        .select("template_data, topics, estimated_duration, status")
        .eq("id", id)
        .single();

      // Get expected steps from AI-generated data, default to 4 steps
      const aiSteps = labData?.template_data?.steps || [];
      const expectedSteps = aiSteps.length > 0 
        ? aiSteps.map((step: any) => step.id)
        : ['read', 'predict', 'explain', 'edge-cases'];
      const totalSteps = expectedSteps.length;
      
      const completedCount = allProgress?.filter((p: any) => p.completed).length || 0;
      const allExpectedStepsCompleted = expectedSteps.every((stepId: string) => 
        allProgress?.some((p: any) => p.step_id === stepId && p.completed)
      );

      // Only mark as completed if all expected steps are done
      if (completedCount === totalSteps && allExpectedStepsCompleted) {
        await supabase
          .from("labs")
          .update({ 
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", id);

        // Update dashboard with lab completion
        try {
          await updateDashboardActivity(userId, {
            activityType: 'lab_completed',
            minutes: labData?.estimated_duration || 30,
            topics: labData?.topics || [],
            successRate: 100, // Assume 100% success for completed labs
          });
        } catch (dashError) {
          console.error('Error updating dashboard:', dashError);
          // Don't fail the request if dashboard update fails
        }
      }
    }

    return res.status(200).json({ message: "Progress updated successfully" });
  } catch (error) {
    console.error("Error in POST /labs/:id/progress:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Add comment to lab
router.post("/:id/comments", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { text } = req.body;

    const { error } = await supabase
      .from("lab_comments")
      .insert([
        {
          lab_id: id,
          text
        }
      ]);

    if (error) {
      console.error("Error creating comment:", error);
      return res.status(500).json({ error: "Failed to create comment" });
    }

    return res.status(201).json({ message: "Comment added successfully" });
  } catch (error) {
    console.error("Error in POST /labs/:id/comments:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete comment
router.delete("/:id/comments/:commentId", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { commentId } = req.params;

    const { error } = await supabase
      .from("lab_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      return res.status(500).json({ error: "Failed to delete comment" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error in DELETE /labs/:id/comments/:commentId:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// AI assistance endpoint for templates
router.post("/:id/ai-assist", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Get the lab to know which template type
    const { data: lab, error: labError } = await supabase
      .from("labs")
      .select("template_type")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (labError || !lab) {
      return res.status(404).json({ error: "Lab not found" });
    }

    // Get AI assistance
    const assistance = await getLabAIAssistance(
      lab.template_type,
      prompt,
      context
    );

    return res.json({ assistance });
  } catch (error) {
    console.error("Error in POST /labs/:id/ai-assist:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
