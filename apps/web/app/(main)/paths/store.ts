import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  LearningPath,
  FilterTab,
  ViewMode,
  PathFile,
  Difficulty
} from "./types";
import { createPath, updatePath as updatePathAPI, deletePath as deletePathAPI, generatePath } from "@/lib/api/paths";
import { markPrimaryFeature, trackEvent } from "@/lib/analytics";

type PathDraft = Omit<
  LearningPath,
  "id" | "createdAt" | "comments" | "files" | "modules" | "starred" | "reminderDate"
> & { learnByDoing?: boolean; includeLabs?: boolean };

interface PathStore {
  paths: LearningPath[];
  selectedPathId: string | null;
  activeTab: FilterTab;
  isAddDialogOpen: boolean;
  isPathSheetOpen: boolean;
  viewMode: ViewMode;
  filterDifficulty: Difficulty | null;
  filterEstimatedDuration: string | null;
  showCorePathsOnly: boolean;
  searchQuery: string;
  generationStatus: string | null;

  // Actions
  setPaths: (paths: LearningPath[]) => void;
  setGenerationStatus: (status: string | null) => void;
  addPath: (path: PathDraft) => Promise<void>;
  generatePathWithAI: (path: PathDraft) => Promise<void>;
  updatePath: (id: string, updatedPath: Partial<Omit<LearningPath, "id">>) => Promise<void>;
  deletePath: (id: string) => Promise<void>;
  setSelectedPathId: (id: string | null) => void;
  setActiveTab: (tab: FilterTab) => void;
  setAddDialogOpen: (isOpen: boolean) => void;
  setPathSheetOpen: (isOpen: boolean) => void;
  addComment: (pathId: string, text: string) => void;
  deleteComment: (pathId: string, commentId: string) => void;
  reorderPaths: (pathPositions: { id: string; position: number }[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilterDifficulty: (difficulty: Difficulty | null) => void;
  setFilterEstimatedDuration: (duration: string | null) => void;
  toggleShowCorePathsOnly: () => void;
  setSearchQuery: (query: string) => void;
  addFile: (pathId: string, file: Omit<PathFile, "id">) => void;
  removeFile: (pathId: string, fileId: string) => void;
  addModule: (pathId: string, title: string, description?: string) => void;
  updateModule: (pathId: string, moduleId: string, completed: boolean) => void;
  removeModule: (pathId: string, moduleId: string) => void;
  toggleStarred: (pathId: string) => Promise<void>;
}

export const usePathStore = create<PathStore>((set) => ({
  paths: [],
  selectedPathId: null,
  activeTab: "all",
  isAddDialogOpen: false,
  isPathSheetOpen: false,
  viewMode: "list",
  filterDifficulty: null,
  filterEstimatedDuration: null,
  showCorePathsOnly: false,
  searchQuery: "",
  generationStatus: null,

  setPaths: (paths) =>
    set(() => ({
      paths: paths
    })),

  setGenerationStatus: (status) => set({ generationStatus: status }),
    
  addPath: async (path) => {
    try {
      const newPath = await createPath({
        title: path.title,
        description: path.description,
        topics: [],
        difficulty: path.difficulty,
        estimated_duration: 0,
      });
      trackEvent("learning_path_created", {
        path_id: newPath.id,
        generated_by_ai: false,
        topic_domain: (newPath as any)?.topics?.[0] || null,
        difficulty_level: (newPath as any)?.difficulty || null,
        total_labs: Array.isArray((newPath as any)?.learning_path_items)
          ? (newPath as any).learning_path_items.length
          : null
      });
      markPrimaryFeature("learning_path");
      set((state) => ({
        paths: [...state.paths, newPath]
      }));
    } catch (error) {
      console.error("Error creating path:", error);
      throw error;
    }
  },

  generatePathWithAI: async (path) => {
    try {
      set({ generationStatus: "Initializing AI..." });
      
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      
      const response = await fetch(`${API_BASE_URL}/paths/generate?stream=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: JSON.stringify({
          title: path.title,
          description: path.description,
          topics: [],
          difficulty: path.difficulty,
          learn_by_doing: path.learnByDoing,
          include_labs: path.includeLabs,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to generate path");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === "status") {
              set({ generationStatus: data.message });
            } else if (data.type === "outline") {
              set({ generationStatus: `Planned ${data.outline.modules.length} modules...` });
            } else if (data.type === "module_start") {
              set({ generationStatus: `Creating module: ${data.title}...` });
            } else if (data.type === "module_complete") {
              set({ generationStatus: `Finished module: ${data.title}` });
            } else if (data.type === "completed") {
              const newPath = data.path;
              trackEvent("learning_path_created", {
                path_id: newPath.id,
                generated_by_ai: true,
                topic_domain: (newPath as any)?.topics?.[0] || null,
                difficulty_level: (newPath as any)?.difficulty || null,
                total_labs: Array.isArray((newPath as any)?.learning_path_items)
                  ? (newPath as any).learning_path_items.length
                  : null
              });
              markPrimaryFeature("learning_path");
              set((state) => ({
                paths: [...state.paths, newPath],
                generationStatus: null
              }));
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          }
        }
      }
    } catch (error) {
      set({ generationStatus: null });
      console.error("Error generating path with AI:", error);
      throw error;
    }
  },

  updatePath: async (id, updatedPath) => {
    try {
      // Optimistically update UI
      set((state) => ({
        paths: state.paths.map((path) => (path.id === id ? { ...path, ...updatedPath } : path))
      }));
      
      // Update on server
      await updatePathAPI(id, {
        title: updatedPath.title,
        description: updatedPath.description,
        status: updatedPath.status,
        starred: updatedPath.starred,
        difficulty: updatedPath.difficulty,
      });
    } catch (error) {
      console.error("Error updating path:", error);
      throw error;
    }
  },

  deletePath: async (id) => {
    try {
      // Optimistically update UI
      set((state) => ({
        paths: state.paths.filter((path) => path.id !== id)
      }));
      
      // Delete on server
      await deletePathAPI(id);
    } catch (error) {
      console.error("Error deleting path:", error);
      throw error;
    }
  },

  setSelectedPathId: (id) =>
    set(() => ({
      selectedPathId: id
    })),

  setActiveTab: (tab) =>
    set(() => ({
      activeTab: tab
    })),

  setAddDialogOpen: (isOpen) =>
    set(() => ({
      isAddDialogOpen: isOpen
    })),

  setPathSheetOpen: (isOpen) =>
    set(() => ({
      isPathSheetOpen: isOpen
    })),

  addComment: (pathId, text) =>
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId
          ? {
              ...path,
              comments: [
                ...path.comments,
                {
                  id: uuidv4(),
                  text,
                  createdAt: new Date()
                }
              ]
            }
          : path
      )
    })),

  deleteComment: (pathId, commentId) =>
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId
          ? {
              ...path,
              comments: path.comments.filter((comment) => comment.id !== commentId)
            }
          : path
      )
    })),

  reorderPaths: (pathPositions) =>
    set((state) => {
      const reorderedPaths = [...state.paths];

      pathPositions.forEach(({ id, position }) => {
        const pathIndex = reorderedPaths.findIndex((path) => path.id === id);
        if (pathIndex !== -1) {
          const [path] = reorderedPaths.splice(pathIndex, 1);
          reorderedPaths.splice(position, 0, path);
        }
      });

      return { paths: reorderedPaths };
    }),

  setViewMode: (mode) =>
    set(() => ({
      viewMode: mode
    })),

  setFilterDifficulty: (difficulty) =>
    set(() => ({
      filterDifficulty: difficulty
    })),

  setFilterEstimatedDuration: (duration) =>
    set(() => ({
      filterEstimatedDuration: duration
    })),

  setSearchQuery: (query) =>
    set(() => ({
      searchQuery: query
    })),

  toggleShowCorePathsOnly: () =>
    set((state) => ({
      showCorePathsOnly: !state.showCorePathsOnly
    })),

  addFile: (pathId, file) =>
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId
          ? {
              ...path,
              files: [
                ...(path.files || []),
                {
                  ...file,
                  id: uuidv4()
                }
              ]
            }
          : path
      )
    })),

  removeFile: (pathId, fileId) =>
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId
          ? {
              ...path,
              files: (path.files || []).filter((file) => file.id !== fileId)
            }
          : path
      )
    })),

  addModule: (pathId, title, description) =>
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId
          ? {
              ...path,
              modules: [
                ...(path.modules || []),
                {
                  id: uuidv4(),
                  title,
                  description,
                  completed: false
                }
              ]
            }
          : path
      )
    })),

  updateModule: (pathId, moduleId, completed) =>
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId
          ? {
              ...path,
              modules: (path.modules || []).map((module) =>
                module.id === moduleId ? { ...module, completed } : module
              )
            }
          : path
      )
    })),

  removeModule: (pathId, moduleId) =>
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId
          ? {
              ...path,
              modules: (path.modules || []).filter((module) => module.id !== moduleId)
            }
          : path
      )
    })),

  toggleStarred: async (pathId) => {
    try {
      const path = usePathStore.getState().paths.find(p => p.id === pathId);
      if (!path) return;
      
      const newStarredValue = !path.starred;
      
      // Optimistically update UI
      set((state) => ({
        paths: state.paths.map((p) =>
          p.id === pathId ? { ...p, starred: newStarredValue } : p
        )
      }));
      
      // Update on server
      await updatePathAPI(pathId, { starred: newStarredValue });
    } catch (error) {
      console.error("Error toggling starred:", error);
      // Revert on error
      set((state) => ({
        paths: state.paths.map((p) =>
          p.id === pathId ? { ...p, starred: !p.starred } : p
        )
      }));
      throw error;
    }
  }
}));
