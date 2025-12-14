import { create } from "zustand";

export interface OnboardingData {
  interests: string[];
  workPreferences: {
    workStyle: string;
    experience: string;
    availability: string;
  };
  accountType: string;
}

interface OnboardingStore {
  currentStep: number;
  data: OnboardingData;
  setCurrentStep: (step: number) => void;
  updateInterests: (interests: string[]) => void;
  updateWorkPreferences: (preferences: Partial<OnboardingData["workPreferences"]>) => void;
  updateAccountType: (accountType: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

const initialData: OnboardingData = {
  interests: [],
  workPreferences: {
    workStyle: "",
    experience: "",
    availability: ""
  },
  accountType: ""
};

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  currentStep: 0,
  data: initialData,
  setCurrentStep: (step) => set({ currentStep: step }),
  updateInterests: (interests) =>
    set((state) => ({
      data: { ...state.data, interests }
    })),
  updateWorkPreferences: (preferences) =>
    set((state) => ({
      data: {
        ...state.data,
        workPreferences: { ...state.data.workPreferences, ...preferences }
      }
    })),
  updateAccountType: (accountType) =>
    set((state) => ({
      data: { ...state.data, accountType }
    })),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),
  reset: () => set({ currentStep: 0, data: initialData })
}));
