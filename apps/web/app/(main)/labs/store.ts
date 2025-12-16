import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  Lab,
  FilterTab,
  ViewMode,
  LabFile,
  LabPriority,
  Difficulty,
  LabType
} from "./types";

interface LabStore {
  labs: Lab[];
  selectedLabId: string | null;
  activeTab: FilterTab;
  isAddDialogOpen: boolean;
  isLabSheetOpen: boolean;
  viewMode: ViewMode;
  filterDifficulty: Difficulty | null;
  filterLabType: LabType | null;
  filterEstimatedTime: string | null;
  showCoreLabsOnly: boolean;
  searchQuery: string;

  // Actions
  setLabs: (labs: Lab[]) => void;
  addLab: (
    lab: Omit<
      Lab,
      "id" | "createdAt" | "comments" | "files" | "subTasks" | "starred" | "reminderDate"
    >
  ) => void;
  updateLab: (id: string, updatedLab: Partial<Omit<Lab, "id">>) => void;
  deleteLab: (id: string) => void;
  setSelectedLabId: (id: string | null) => void;
  setActiveTab: (tab: FilterTab) => void;
  setAddDialogOpen: (isOpen: boolean) => void;
  setLabSheetOpen: (isOpen: boolean) => void;
  addComment: (labId: string, text: string) => void;
  deleteComment: (labId: string, commentId: string) => void;
  reorderLabs: (labPositions: { id: string; position: number }[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilterDifficulty: (difficulty: Difficulty | null) => void;
  setFilterLabType: (labType: LabType | null) => void;
  setFilterEstimatedTime: (time: string | null) => void;
  toggleShowCoreLabsOnly: () => void;
  setSearchQuery: (query: string) => void;
  addFile: (labId: string, file: Omit<LabFile, "id">) => void;
  removeFile: (labId: string, fileId: string) => void;
  addLabSection: (labId: string, title: string) => void;
  updateLabSection: (labId: string, sectionId: string, completed: boolean) => void;
  removeLabSection: (labId: string, sectionId: string) => void;
  toggleStarred: (labId: string) => void;
}

export const useLabStore = create<LabStore>((set) => ({
  labs: [],
  selectedLabId: null,
  activeTab: "all",
  isAddDialogOpen: false,
  isLabSheetOpen: false,
  viewMode: "list",
  filterDifficulty: null,
  filterLabType: null,
  filterEstimatedTime: null,
  showCoreLabsOnly: false,
  searchQuery: "",

  setLabs: (labs) =>
    set(() => ({
      labs: labs
    })),
  addLab: (lab) =>
    set((state) => ({
      labs: [
        ...state.labs,
        {
          ...lab,
          id: uuidv4(),
          createdAt: new Date(),
          comments: [],
          files: [],
          subTasks: [],
          starred: false
        }
      ]
    })),

  updateLab: (id, updatedLab) =>
    set((state) => ({
      labs: state.labs.map((lab) => (lab.id === id ? { ...lab, ...updatedLab } : lab))
    })),

  deleteLab: (id) =>
    set((state) => ({
      labs: state.labs.filter((lab) => lab.id !== id)
    })),

  setSelectedLabId: (id) =>
    set(() => ({
      selectedLabId: id
    })),

  setActiveTab: (tab) =>
    set(() => ({
      activeTab: tab
    })),

  setAddDialogOpen: (isOpen) =>
    set(() => ({
      isAddDialogOpen: isOpen
    })),

  setLabSheetOpen: (isOpen) =>
    set(() => ({
      isLabSheetOpen: isOpen
    })),

  addComment: (labId, text) =>
    set((state) => ({
      labs: state.labs.map((lab) =>
        lab.id === labId
          ? {
              ...lab,
              comments: [
                ...lab.comments,
                {
                  id: uuidv4(),
                  text,
                  createdAt: new Date()
                }
              ]
            }
          : lab
      )
    })),

  deleteComment: (labId, commentId) =>
    set((state) => ({
      labs: state.labs.map((lab) =>
        lab.id === labId
          ? {
              ...lab,
              comments: lab.comments.filter((comment) => comment.id !== commentId)
            }
          : lab
      )
    })),

  reorderLabs: (labPositions) =>
    set((state) => {
      const reorderedLabs = [...state.labs];

      labPositions.forEach(({ id, position }) => {
        const labIndex = reorderedLabs.findIndex((lab) => lab.id === id);
        if (labIndex !== -1) {
          const [lab] = reorderedLabs.splice(labIndex, 1);
          reorderedLabs.splice(position, 0, lab);
        }
      });

      return { labs: reorderedLabs };
    }),

  setViewMode: (mode) =>
    set(() => ({
      viewMode: mode
    })),

  setFilterDifficulty: (difficulty) =>
    set(() => ({
      filterDifficulty: difficulty
    })),

  setFilterLabType: (labType) =>
    set(() => ({
      filterLabType: labType
    })),

  setFilterEstimatedTime: (time) =>
    set(() => ({
      filterEstimatedTime: time
    })),

  setSearchQuery: (query) =>
    set(() => ({
      searchQuery: query
    })),

  toggleShowCoreLabsOnly: () =>
    set((state) => ({
      showCoreLabsOnly: !state.showCoreLabsOnly
    })),

  addFile: (labId, file) =>
    set((state) => ({
      labs: state.labs.map((lab) =>
        lab.id === labId
          ? {
              ...lab,
              files: [
                ...(lab.files || []),
                {
                  ...file,
                  id: uuidv4()
                }
              ]
            }
          : lab
      )
    })),

  removeFile: (labId, fileId) =>
    set((state) => ({
      labs: state.labs.map((lab) =>
        lab.id === labId
          ? {
              ...lab,
              files: (lab.files || []).filter((file) => file.id !== fileId)
            }
          : lab
      )
    })),

  addLabSection: (labId, title) =>
    set((state) => ({
      labs: state.labs.map((lab) =>
        lab.id === labId
          ? {
              ...lab,
              subTasks: [
                ...(lab.subTasks || []),
                {
                  id: uuidv4(),
                  title,
                  completed: false
                }
              ]
            }
          : lab
      )
    })),

  updateLabSection: (labId, sectionId, completed) =>
    set((state) => ({
      labs: state.labs.map((lab) =>
        lab.id === labId
          ? {
              ...lab,
              subTasks: (lab.subTasks || []).map((section) =>
                section.id === sectionId ? { ...section, completed } : section
              )
            }
          : lab
      )
    })),

  removeLabSection: (labId, sectionId) =>
    set((state) => ({
      labs: state.labs.map((lab) =>
        lab.id === labId
          ? {
              ...lab,
              subTasks: (lab.subTasks || []).filter((section) => section.id !== sectionId)
            }
          : lab
      )
    })),

  toggleStarred: (labId) =>
    set((state) => ({
      labs: state.labs.map((lab) =>
        lab.id === labId ? { ...lab, starred: !lab.starred } : lab
      )
    }))
}));