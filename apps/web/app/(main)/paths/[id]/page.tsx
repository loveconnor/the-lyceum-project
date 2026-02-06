import React from "react";
import { generateMeta } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

import ModulesView from "@/components/modules/modules-view";

type PathStatusValue = "not-started" | "in-progress" | "completed";

type LearningPathItemRecord = {
  id: string;
  lab_id?: string | null;
  order_index: number;
  title: string;
  description?: string | null;
  item_type?: string | null;
  status?: string | null;
  progress_data?: Record<string, unknown> | null;
  content_data?: Record<string, unknown> | null;
  content_mode?: "ai_generated" | "registry_backed" | "learn_by_doing" | null;
  labs?: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    difficulty?: string | null;
    estimated_duration?: number | null;
  } | null;
};

type LearningPathRecord = {
  id: string;
  status?: string | null;
  learning_path_items?: LearningPathItemRecord[] | null;
} & Record<string, unknown>;

type ModulesViewPath = React.ComponentProps<typeof ModulesView>["path"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id: pathId } = await params;
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: learningPath } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("id", pathId)
        .eq("user_id", user.id)
        .single();
      
      if (learningPath) {
        return generateMeta({
          title: `The Lyceum Project - ${learningPath.title}`,
          description: learningPath.description || `Explore the modules in ${learningPath.title}`,
          canonical: `/paths/${pathId}`
        });
      }
    }
  } catch (error) {
    console.error("Error fetching learning path:", error);
  }
  
  return generateMeta({
    title: "The Lyceum Project - Path Not Found",
    description: "The requested learning path could not be found.",
    canonical: `/paths/${pathId}`
  });
}

export default async function PathModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: pathId } = await params;
  const supabase = await createClient();
  let pathWithModules: ModulesViewPath | null = null;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      notFound();
    }
    
    const { data: learningPath, error } = await supabase
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
          progress_data,
          content_data,
          content_mode,
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
      .eq("id", pathId)
      .eq("user_id", user.id)
      .single();

    if (error || !learningPath) {
      console.error("Error fetching learning path:", error);
      notFound();
    }
    
    const typedPath = learningPath as LearningPathRecord;
    const items = typedPath.learning_path_items ?? [];
    let calculatedStatus: PathStatusValue = "not-started";
    
    if (items.length > 0) {
      const completedCount = items.filter((item) => item.status === "completed").length;
      const inProgressCount = items.filter((item) => item.status === "in-progress").length;
      
      if (completedCount === items.length) {
        calculatedStatus = "completed";
      } else if (inProgressCount > 0 || completedCount > 0) {
        calculatedStatus = "in-progress";
      }
    }
    
    // Update path status in database if it has changed
    if (calculatedStatus !== typedPath.status) {
      await supabase
        .from("learning_paths")
        .update({ status: calculatedStatus })
        .eq("id", pathId)
        .eq("user_id", user.id);
      
      typedPath.status = calculatedStatus;
    }
    
    // Map learning_path_items to modules format
    const modules = [...items]
      .sort((a, b) => a.order_index - b.order_index)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        completed: item.status === "completed",
        item_type: item.item_type,
        status:
          item.status === "completed" || item.status === "in-progress"
            ? item.status
            : "not-started",
        progress_data: item.progress_data,
        content_data: item.content_data,
        content_mode: item.content_mode,
        lab_id: item.lab_id,
        labs: item.labs
      }));
    
    pathWithModules = {
      ...(typedPath as ModulesViewPath),
      modules
    };
  } catch (error) {
    console.error("Error fetching learning path:", error);
    notFound();
  }

  if (!pathWithModules) {
    notFound();
  }

  return <ModulesView path={pathWithModules} />;
}
