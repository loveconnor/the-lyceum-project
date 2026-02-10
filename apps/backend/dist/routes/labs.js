"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabaseAdmin_1 = require("../supabaseAdmin");
const ai_lab_generator_1 = require("../ai-lab-generator");
const dashboardService_1 = require("../dashboardService");
const lab_template_normalizer_1 = require("../lab-template-normalizer");
const router = (0, express_1.Router)();
const asNonEmptyString = (value) => {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};
const collectStrings = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => {
        if (typeof entry === "string")
            return asNonEmptyString(entry);
        if (entry && typeof entry === "object") {
            const record = entry;
            return (asNonEmptyString(record.concept) ||
                asNonEmptyString(record.title) ||
                asNonEmptyString(record.name) ||
                asNonEmptyString(record.explanation));
        }
        return null;
    })
        .filter((entry) => Boolean(entry));
};
const unique = (values, max) => {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const normalized = value.toLowerCase();
        if (seen.has(normalized))
            continue;
        seen.add(normalized);
        result.push(value);
        if (result.length >= max)
            break;
    }
    return result;
};
const extractModuleConcepts = (contentData) => {
    if (!contentData || typeof contentData !== "object")
        return [];
    const collected = [];
    collected.push(...collectStrings(contentData.learning_objectives));
    collected.push(...collectStrings(contentData.key_concepts));
    collected.push(...collectStrings(contentData.practical_exercises));
    collected.push(...collectStrings(contentData.sections));
    collected.push(...collectStrings(contentData.chapters));
    collected.push(...collectStrings(contentData.concepts));
    return unique(collected, 24);
};
const summarizeModuleScope = (module) => {
    const title = asNonEmptyString(module.title) || "Untitled module";
    const concepts = extractModuleConcepts(module.content_data);
    if (concepts.length > 0) {
        return `- "${title}": ${concepts.join(", ")}`;
    }
    const description = asNonEmptyString(module.description);
    if (description) {
        return `- "${title}": ${description}`;
    }
    return `- "${title}"`;
};
const includesAnyKeyword = (concepts, keywords) => {
    const combined = concepts.join(" ").toLowerCase();
    return keywords.some((keyword) => combined.includes(keyword));
};
const buildProgrammingFeatureGates = (allowedConcepts, reservedFutureConcepts) => {
    const methodKeywords = [
        "method",
        "methods",
        "function",
        "functions",
        "parameters",
        "return value",
        "return type",
    ];
    const classKeywords = [
        "class",
        "classes",
        "object-oriented",
        "oop",
        "constructor",
        "instance",
    ];
    const methodsCovered = includesAnyKeyword(allowedConcepts, methodKeywords);
    const methodsInFuture = includesAnyKeyword(reservedFutureConcepts, methodKeywords);
    const classesCovered = includesAnyKeyword(allowedConcepts, classKeywords);
    const classesInFuture = includesAnyKeyword(reservedFutureConcepts, classKeywords);
    const gates = [];
    if (!methodsCovered || methodsInFuture) {
        gates.push("- Methods/functions are NOT in scope. Do not ask learners to create new methods/functions/lambdas. Keep work at the statement level inside provided scaffolding.");
    }
    if (!classesCovered || classesInFuture) {
        gates.push("- Class design is NOT in scope. Do not require learners to author new classes/constructors. If the language needs a wrapper class, provide it fully as fixed scaffolding.");
    }
    if (gates.length === 0) {
        gates.push("- Method/function usage is allowed because it appears in covered concepts.");
    }
    return gates;
};
// Get all labs for current user
router.get("/", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
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
    }
    catch (error) {
        console.error("Error in GET /labs:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Get single lab with progress
router.get("/:id", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
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
        const pathItem = lab.learning_path_items?.[0];
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
    }
    catch (error) {
        console.error("Error in GET /labs/:id:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Generate lab with AI
router.post("/generate", async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { learningGoal, context, userProfile, path_id, path_item_id } = req.body;
        if (!learningGoal) {
            return res.status(400).json({ error: "Learning goal is required" });
        }
        // If path_id is provided, fetch path details and previous modules to include as context
        let enrichedContext = context || '';
        if (path_id) {
            const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
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
                    .select('id, title, description, order_index, item_type, content_data, status')
                    .eq('path_id', path_id)
                    .order('order_index', { ascending: true });
                // Build context about covered content
                let coveredTopicsContext = '';
                if (pathItems && !itemsError && pathItems.length > 0) {
                    const orderedPathItems = pathItems
                        .slice()
                        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                    const targetPathItem = path_item_id
                        ? orderedPathItems.find((item) => item.id === path_item_id)
                        : null;
                    let inScopeModules = [];
                    let outOfScopeModules = [];
                    if (targetPathItem?.item_type === 'lab') {
                        inScopeModules = orderedPathItems.filter((item) => item.item_type === 'module' && item.order_index < targetPathItem.order_index);
                        outOfScopeModules = orderedPathItems.filter((item) => item.item_type === 'module' && item.order_index > targetPathItem.order_index);
                    }
                    else if (targetPathItem?.item_type === 'module') {
                        inScopeModules = orderedPathItems.filter((item) => item.item_type === 'module' && item.order_index <= targetPathItem.order_index);
                        outOfScopeModules = orderedPathItems.filter((item) => item.item_type === 'module' && item.order_index > targetPathItem.order_index);
                    }
                    else {
                        inScopeModules = orderedPathItems.filter((item) => item.item_type === 'module' && item.status === 'completed');
                    }
                    if (inScopeModules.length === 0) {
                        inScopeModules = orderedPathItems.filter((item) => item.item_type === 'module').slice(0, 1);
                    }
                    if (inScopeModules.length > 0) {
                        const moduleScopeSummary = inScopeModules.map(summarizeModuleScope);
                        const allowedConcepts = unique(inScopeModules.flatMap((module) => extractModuleConcepts(module.content_data)), 30);
                        const reservedFutureConcepts = unique(outOfScopeModules.flatMap((module) => extractModuleConcepts(module.content_data)), 24).filter((concept) => !allowedConcepts.some((allowed) => allowed.toLowerCase() === concept.toLowerCase()));
                        const moduleContext = targetPathItem &&
                            targetPathItem.content_data &&
                            typeof targetPathItem.content_data === 'object'
                            ? asNonEmptyString(targetPathItem.content_data.module_context)
                            : null;
                        const positionSummary = targetPathItem?.item_type === 'lab'
                            ? `This lab is path item #${targetPathItem.order_index + 1} and must only use knowledge from modules before it.`
                            : targetPathItem?.item_type === 'module'
                                ? `This lab is being generated for module order #${targetPathItem.order_index + 1}.`
                                : 'Use only knowledge from modules already covered in this path.';
                        const allowedConceptLines = allowedConcepts.length
                            ? allowedConcepts.map((concept) => `- ${concept}`).join('\n')
                            : '- Use only the concepts explicitly listed in the in-scope modules.';
                        const reservedConceptLines = reservedFutureConcepts.length
                            ? `\n\nFUTURE MODULE CONCEPTS (DO NOT USE YET):\n${reservedFutureConcepts.map((concept) => `- ${concept}`).join('\n')}`
                            : '';
                        const programmingFeatureGates = buildProgrammingFeatureGates(allowedConcepts, reservedFutureConcepts);
                        coveredTopicsContext = [
                            '',
                            '',
                            'LAB SCOPE (STRICT):',
                            positionSummary,
                            moduleContext ? `Primary module for this lab: "${moduleContext}".` : null,
                            '',
                            'MODULES ALREADY COVERED (only use these):',
                            ...moduleScopeSummary,
                            '',
                            'CONCEPTS COVERED IN PREVIOUS MODULES (you MUST only use concepts from this list):',
                            allowedConceptLines,
                            reservedConceptLines,
                            '',
                            'PROGRAMMING FEATURE GATES (STRICT):',
                            ...programmingFeatureGates,
                            '',
                            'IMPORTANT: Do not introduce new concepts, syntax, APIs, or techniques that are not explicitly covered above.',
                        ]
                            .filter((line) => line !== null)
                            .join('\n');
                    }
                }
                // Prepend path context to any existing context
                const pathContext = `This lab is part of the learning path "${pathData.title}"${pathData.description ? `: ${pathData.description}` : ''}${pathData.topics?.length ? `. Path topics: ${pathData.topics.join(', ')}` : ''}${pathData.difficulty ? `. Difficulty level: ${pathData.difficulty}` : ''}. Please ensure the lab aligns with the path's subject matter, programming language, and difficulty level.${coveredTopicsContext}`;
                enrichedContext = enrichedContext ? `${pathContext}\n\n${enrichedContext}` : pathContext;
                console.log('Enriched lab context with path and covered topics:', pathContext);
            }
            else if (pathError) {
                console.warn('Failed to fetch path context:', pathError);
            }
        }
        // Generate the lab using AI
        const generatedLab = await (0, ai_lab_generator_1.generateLab)({
            learningGoal,
            context: enrichedContext,
            userProfile,
            path_id,
        });
        if (!(0, lab_template_normalizer_1.isLabTemplateType)(generatedLab.template_type)) {
            throw new Error(`Generator returned unsupported template type: ${generatedLab.template_type}`);
        }
        const generatedTemplateData = {
            ...(0, lab_template_normalizer_1.normalizeTemplateData)(generatedLab.template_type, generatedLab.template_data),
            __lyceum_scope_version: 3,
        };
        // Save to database
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const { data: newLab, error } = await supabase
            .from("labs")
            .insert([
            {
                user_id: userId,
                title: generatedLab.title,
                description: generatedLab.description,
                template_type: generatedLab.template_type,
                template_data: generatedTemplateData,
                difficulty: (0, lab_template_normalizer_1.normalizeDifficulty)(generatedLab.difficulty),
                estimated_duration: (0, lab_template_normalizer_1.normalizeEstimatedDuration)(generatedLab.estimated_duration),
                topics: (0, lab_template_normalizer_1.normalizeTopics)(generatedLab.topics),
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
    }
    catch (error) {
        console.error("Error in POST /labs/generate:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
});
// Create new lab (manual)
router.post("/", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { title, description, template_type, template_data, difficulty, estimated_duration, topics, due_date } = req.body;
        if (!title || !template_type || !template_data) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        if (!(0, lab_template_normalizer_1.isLabTemplateType)(template_type)) {
            return res.status(400).json({ error: "Invalid template type" });
        }
        const normalizedTemplateData = (0, lab_template_normalizer_1.normalizeTemplateData)(template_type, template_data);
        const normalizedDifficulty = difficulty == null ? null : (0, lab_template_normalizer_1.normalizeDifficulty)(difficulty);
        const normalizedEstimatedDuration = estimated_duration == null ? null : (0, lab_template_normalizer_1.normalizeEstimatedDuration)(estimated_duration);
        const normalizedTopics = Array.isArray(topics) && topics.length > 0 ? (0, lab_template_normalizer_1.normalizeTopics)(topics) : null;
        const { data: newLab, error } = await supabase
            .from("labs")
            .insert([
            {
                user_id: userId,
                title,
                description,
                template_type,
                template_data: normalizedTemplateData,
                difficulty: normalizedDifficulty,
                estimated_duration: normalizedEstimatedDuration,
                topics: normalizedTopics,
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
    }
    catch (error) {
        console.error("Error in POST /labs:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Update lab
router.patch("/:id", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { id } = req.params;
        const updates = { ...req.body };
        if (updates.template_type != null) {
            if (!(0, lab_template_normalizer_1.isLabTemplateType)(updates.template_type)) {
                return res.status(400).json({ error: "Invalid template type" });
            }
        }
        if (updates.template_data != null) {
            let effectiveTemplateType = updates.template_type;
            if (!effectiveTemplateType) {
                const { data: existingLab, error: existingLabError } = await supabase
                    .from("labs")
                    .select("template_type")
                    .eq("id", id)
                    .eq("user_id", userId)
                    .single();
                if (existingLabError || !existingLab) {
                    return res.status(404).json({ error: "Lab not found" });
                }
                effectiveTemplateType = existingLab.template_type;
            }
            if (!(0, lab_template_normalizer_1.isLabTemplateType)(effectiveTemplateType)) {
                return res.status(400).json({ error: "Invalid template type for template_data update" });
            }
            updates.template_data = (0, lab_template_normalizer_1.normalizeTemplateData)(effectiveTemplateType, updates.template_data);
        }
        if (updates.difficulty != null) {
            updates.difficulty = (0, lab_template_normalizer_1.normalizeDifficulty)(updates.difficulty);
        }
        if (updates.estimated_duration != null) {
            updates.estimated_duration = (0, lab_template_normalizer_1.normalizeEstimatedDuration)(updates.estimated_duration);
        }
        if ("topics" in updates) {
            updates.topics = Array.isArray(updates.topics) ? (0, lab_template_normalizer_1.normalizeTopics)(updates.topics) : null;
        }
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
    }
    catch (error) {
        console.error("Error in PATCH /labs/:id:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Delete lab
router.delete("/:id", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
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
            await (0, dashboardService_1.updateDashboardActivity)(userId, {
                activityType: 'lab_deleted',
                topics: [],
                minutes: 0,
            });
        }
        catch (dashError) {
            console.error('Error updating dashboard after lab deletion:', dashError);
            // Don't fail the request if dashboard update fails
        }
        return res.status(204).send();
    }
    catch (error) {
        console.error("Error in DELETE /labs/:id:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Reset lab progress
router.post("/:id/reset", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
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
    }
    catch (error) {
        console.error("Error in POST /labs/:id/reset:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Update lab progress
router.post("/:id/progress", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
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
                await (0, dashboardService_1.updateDashboardActivity)(userId, {
                    activityType: 'lab_started',
                    topics: labInfo?.topics || [],
                    minutes: 0,
                });
            }
            catch (dashError) {
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
            // Determine expected steps dynamically from lab template or existing progress.
            const aiSteps = Array.isArray(labData?.template_data?.steps) ? labData.template_data.steps : [];
            const expectedFromTemplate = aiSteps
                .map((step) => step?.id)
                .filter((value) => typeof value === "string" && value.trim().length > 0);
            const expectedFromProgress = Array.from(new Set((allProgress || [])
                .map((p) => p?.step_id)
                .filter((value) => typeof value === "string" && value.trim().length > 0)));
            const expectedSteps = expectedFromTemplate.length > 0
                ? expectedFromTemplate
                : expectedFromProgress.length > 0
                    ? expectedFromProgress
                    : [step_id];
            const totalSteps = expectedSteps.length;
            const completedCount = allProgress?.filter((p) => p.completed).length || 0;
            const allExpectedStepsCompleted = expectedSteps.every((stepId) => allProgress?.some((p) => p.step_id === stepId && p.completed));
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
                    await (0, dashboardService_1.updateDashboardActivity)(userId, {
                        activityType: 'lab_completed',
                        minutes: labData?.estimated_duration || 30,
                        topics: labData?.topics || [],
                        successRate: 100, // Assume 100% success for completed labs
                    });
                }
                catch (dashError) {
                    console.error('Error updating dashboard:', dashError);
                    // Don't fail the request if dashboard update fails
                }
            }
        }
        return res.status(200).json({ message: "Progress updated successfully" });
    }
    catch (error) {
        console.error("Error in POST /labs/:id/progress:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Add comment to lab
router.post("/:id/comments", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
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
    }
    catch (error) {
        console.error("Error in POST /labs/:id/comments:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// Delete comment
router.delete("/:id/comments/:commentId", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
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
    }
    catch (error) {
        console.error("Error in DELETE /labs/:id/comments/:commentId:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// AI assistance endpoint for templates
router.post("/:id/ai-assist", async (req, res) => {
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        const userId = req.user?.id;
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
        const assistance = await (0, ai_lab_generator_1.getLabAIAssistance)(lab.template_type, prompt, context);
        return res.json({ assistance });
    }
    catch (error) {
        console.error("Error in POST /labs/:id/ai-assist:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
