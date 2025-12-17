import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  LearningPath,
  FilterTab,
  ViewMode,
  PathFile,
  Difficulty
} from "./types";

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
  ) => void;
  updatePath: (id: string, updatedPath: Partial<Omit<LearningPath, "id">>) => void;
  deletePath: (id: string) => void;
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
  toggleStarred: (pathId: string) => void;
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
  addPath: (path) =>
    set((state) => ({
      paths: [
        ...state.paths,
        {
          ...path,
          id: uuidv4(),
          createdAt: new Date(),
          comments: [],
          files: [],
          modules: [],
          starred: false
        }
      ]
    })),

  updatePath: (id, updatedPath) =>
    set((state) => ({
      paths: state.paths.map((path) => (path.id === id ? { ...path, ...updatedPath } : path))
    })),

  deletePath: (id) =>
    set((state) => ({
      paths: state.paths.filter((path) => path.id !== id)
    })),

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

  toggleStarred: (pathId) =>
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId ? { ...path, starred: !path.starred } : path
      )
    }))
}));