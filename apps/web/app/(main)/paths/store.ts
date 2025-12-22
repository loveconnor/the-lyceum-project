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

  // Actions
  setPaths: (paths: LearningPath[]) => void;
  addPath: (
    path: Omit<
      LearningPath,
      "id" | "createdAt" | "comments" | "files" | "modules" | "starred" | "reminderDate"
    >
  ) => Promise<void>;
  generatePathWithAI: (
    path: Omit<
      LearningPath,
      "id" | "createdAt" | "comments" | "files" | "modules" | "starred" | "reminderDate"
    >
  ) => Promise<void>;
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

  setPaths: (paths) =>
    set(() => ({
      paths: paths
    })),
    
  addPath: async (path) => {
    try {
      const newPath = await createPath({
        title: path.title,
        description: path.description,
        topics: [],
        difficulty: path.difficulty,
        estimated_duration: 0,
      });
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
      const newPath = await generatePath({
        title: path.title,
        description: path.description,
        topics: [],
        difficulty: path.difficulty,
        estimated_duration: 0,
      });
      set((state) => ({
        paths: [...state.paths, newPath]
      }));
    } catch (error) {
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
