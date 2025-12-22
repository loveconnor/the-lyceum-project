import React from "react";
import { generateMeta } from "@/lib/utils";
import { LearningPath } from "./types";
import { createClient } from "@/utils/supabase/server";

import Paths from "./paths";

export async function generateMetadata() {
  return generateMeta({
    title: "The Lyceum Project - Learning Paths",
    description:
      "Structured learning paths to guide your curriculum. Choose your path and progress through organized modules and labs. Built with shadcn/ui, Next.js and Tailwind CSS.",
    canonical: "/paths"
  });
}

export default async function Page() {
  const supabase = await createClient();
  let paths: LearningPath[] = [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        paths = data as any;
      } else if (error) {
        console.error("Error fetching paths:", error);
      }
    }
  } catch (error) {
    console.error("Error fetching paths:", error);
  }

  return <Paths paths={paths} />;
}