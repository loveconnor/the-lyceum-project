import { createClient } from "@/utils/supabase/server";
import { ReflectionsDashboard } from "./reflections-dashboard";
import { Reflection } from "@/types/reflections";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reflections",
  description: "Review your learning journey and past reflections.",
};

export default async function ReflectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 1. Fetch all reflections
  const { data: reflections } = await supabase
    .from("reflections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!reflections) {
    return <ReflectionsDashboard reflections={[]} />;
  }

  // 2. Enhance reflections with Path titles for modules
  const moduleContextIds = reflections
    .filter(r => r.context_type === 'module' || r.context_type === 'path_item')
    .map(r => r.context_id);
    
  const pathTitleMap = new Map<string, string>();
  const pathIdMap = new Map<string, string>();

  if (moduleContextIds.length > 0) {
    const { data: pathItems } = await supabase
      .from("learning_path_items")
      .select(`
        id,
        path_id,
        learning_paths (
          title
        )
      `)
      .in("id", moduleContextIds);

    if (pathItems) {
      pathItems.forEach((item: { id: string; path_id?: string | null; learning_paths?: { title?: string | null } | null }) => {
        if (item.learning_paths?.title) {
          pathTitleMap.set(item.id, item.learning_paths.title);
        }
        if (item.path_id) {
          pathIdMap.set(item.id, item.path_id);
        }
      });
    }
  }

  // 3. Merge data
  const enhancedReflections = (reflections as Reflection[]).map(r => ({
    ...r,
    pathTitle: pathTitleMap.get(r.context_id),
    pathId: pathIdMap.get(r.context_id)
  }));

  return <ReflectionsDashboard reflections={enhancedReflections} />;
}
