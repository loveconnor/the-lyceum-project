import React from "react";
import { generateMeta } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

import ModulesView from "@/components/modules/modules-view";

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
    
    // Map learning_path_items to modules format
    const modules = (learningPath.learning_path_items || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        completed: item.status === 'completed',
        item_type: item.item_type,
        status: item.status,
        content_data: item.content_data,
        lab_id: item.lab_id,
        labs: item.labs
      }));
    
    const pathWithModules = {
      ...learningPath,
      modules
    };
    
    return <ModulesView path={pathWithModules as any} />;
  } catch (error) {
    console.error("Error fetching learning path:", error);
    notFound();
  }
}
