import { create } from "zustand";
import {
  Lab,
  FilterTab,
  ViewMode,
  Difficulty,
  LabTemplateType,
  LabStatus
} from "./types";
import {
  fetchLabs,
  createLab as apiCreateLab,
  updateLab as apiUpdateLab,
  deleteLab as apiDeleteLab,
  resetLab as apiResetLab,
  addLabComment,
  deleteLabComment,
  updateLabProgress,
  generateLab as apiGenerateLab
} from "@/lib/api/labs";
import { UnifiedLabData } from "@/types/lab-templates";
import { markLabTouched, markPrimaryFeature, trackEvent } from "@/lib/analytics";

interface CreateLabPayload {
  title: string;
  description?: string;
  template_type: LabTemplateType;
  template_data: UnifiedLabData;
  difficulty?: Difficulty;
  estimated_duration?: number;
  topics?: string[];
  due_date?: string;
}

interface LabStore {
  labs: Lab[];
  selectedLabId: string | null;
  activeTab: FilterTab;
  isAddDialogOpen: boolean;
  isLabSheetOpen: boolean;
  viewMode: ViewMode;
  filterDifficulty: Difficulty | null;
  filterLabType: LabTemplateType | null;
  filterEstimatedTime: string | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;

  // Actions
  fetchLabs: () => Promise<void>;
  addLab: (lab: CreateLabPayload) => Promise<void>;
  generateLab: (learningGoal: string, context?: string, isRecommendation?: boolean, pathId?: string) => Promise<Lab>;
  updateLab: (id: string, updatedLab: Partial<Lab>) => Promise<void>;
  resetLab: (id: string) => Promise<void>;
  deleteLab: (id: string, onSuccess?: () => void) => Promise<void>;
  setSelectedLabId: (id: string | null) => void;
  setActiveTab: (tab: FilterTab) => void;
  setAddDialogOpen: (isOpen: boolean) => void;
  setLabSheetOpen: (isOpen: boolean) => void;
  addComment: (labId: string, text: string) => Promise<void>;
  deleteComment: (labId: string, commentId: string) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  setFilterDifficulty: (difficulty: Difficulty | null) => void;
  setFilterLabType: (labType: LabTemplateType | null) => void;
  setFilterEstimatedTime: (time: string | null) => void;
  setSearchQuery: (query: string) => void;
  updateProgress: (labId: string, stepId: string, stepData?: any, completed?: boolean, onSuccess?: () => void) => Promise<void>;
  toggleStarred: (labId: string) => Promise<void>;
}

export const useLabStore = create<LabStore>((set, get) => ({
  labs: [],
  selectedLabId: null,
  activeTab: "all",
  isAddDialogOpen: false,
  isLabSheetOpen: false,
  viewMode: "list",
  filterDifficulty: null,
  filterLabType: null,
  filterEstimatedTime: null,
  searchQuery: "",
  loading: false,
  error: null,

  fetchLabs: async () => {
    set({ loading: true, error: null });
    try {
      const labs = await fetchLabs();
      set({ labs, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addLab: async (labPayload) => {
    set({ loading: true, error: null });
    try {
      const newLab = await apiCreateLab(labPayload);
      markLabTouched(newLab.id);
      markPrimaryFeature("lab");
      trackEvent("lab_started", {
        lab_id: newLab.id,
        lab_type: newLab.starred ? "core" : "optional",
        generated_by_ai: false,
        estimated_duration: newLab.estimated_duration ?? null
      });
      set((state) => ({
        labs: [...state.labs, newLab],
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  generateLab: async (learningGoal, context, isRecommendation = false, pathId) => {
    set({ loading: true, error: null });
    try {
      const newLab = await apiGenerateLab({ learningGoal, context, path_id: pathId });
      markLabTouched(newLab.id);
      markPrimaryFeature("lab");
      trackEvent("lab_started", {
        lab_id: newLab.id,
        lab_type: isRecommendation ? "recommended" : "optional",
        generated_by_ai: true,
        estimated_duration: newLab.estimated_duration ?? null
      });
      if (isRecommendation) {
        trackEvent("lab_recommended_started", {
          lab_id: newLab.id,
          lab_type: "recommended",
          estimated_duration: newLab.estimated_duration ?? null
        });
      }
      set((state) => ({
        labs: [...state.labs, newLab],
        loading: false
      }));
      return newLab;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateLab: async (id, updatedLab) => {
    set({ loading: true, error: null });
    try {
      const updated = await apiUpdateLab(id, updatedLab);
      if (updated.status === "completed") {
        trackEvent("lab_completed", {
          lab_id: updated.id,
          lab_type: updated.starred ? "core" : "optional",
          generated_by_ai: true,
          estimated_duration: updated.estimated_duration ?? null,
          completion_time_seconds: updated.completed_at
            ? Math.max(
                0,
                Math.round(
                  (new Date(updated.completed_at).getTime() - new Date(updated.created_at).getTime()) / 1000
                )
              )
            : null,
          retries_count: updated.lab_progress?.filter((p: any) => p.completed === false).length ?? null
        });
      }
      set((state) => ({
        labs: state.labs.map((lab) => (lab.id === id ? updated : lab)),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  resetLab: async (id) => {
    set({ loading: true, error: null });
    try {
      const updated = await apiResetLab(id);
      set((state) => ({
        labs: state.labs.map((lab) => (lab.id === id ? updated : lab)),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteLab: async (id, onSuccess) => {
    set({ loading: true, error: null });
    try {
      await apiDeleteLab(id);
      set((state) => ({
        labs: state.labs.filter((lab) => lab.id !== id),
        loading: false
      }));
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

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

  addComment: async (labId, text) => {
    set({ loading: true, error: null });
    try {
      await addLabComment(labId, { text });
      // Refetch the specific lab to get the updated comments
      const labs = await fetchLabs();
      set({ labs, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteComment: async (labId, commentId) => {
    set({ loading: true, error: null });
    try {
      await deleteLabComment(labId, commentId);
      // Refetch the specific lab to get the updated comments
      const labs = await fetchLabs();
      set({ labs, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

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

  updateProgress: async (labId, stepId, stepData, completed = false, onSuccess) => {
    set({ loading: true, error: null });
    try {
      await updateLabProgress(labId, { step_id: stepId, step_data: stepData, completed });
      // Refetch labs to get updated progress
      const labs = await fetchLabs();
      set({ labs, loading: false });
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  toggleStarred: async (labId) => {
    const lab = get().labs.find((l) => l.id === labId);
    if (!lab) return;
    
    set({ loading: true, error: null });
    try {
      await apiUpdateLab(labId, { starred: !lab.starred });
      set((state) => ({
        labs: state.labs.map((l) =>
          l.id === labId ? { ...l, starred: !l.starred } : l
        ),
        loading: false
      }));
      if (!lab.starred) {
        trackEvent("lab_marked_core", {
          lab_id: lab.id,
          lab_type: "core",
          generated_by_ai: true,
          estimated_duration: lab.estimated_duration ?? null
        });
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  }
}));
