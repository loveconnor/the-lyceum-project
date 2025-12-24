import { EnumPathStatus } from "./enum";

export type PathStatus = `${EnumPathStatus}`;
export type FilterTab = "all" | PathStatus;
export type ViewMode = "list" | "grid";
export type Difficulty = "intro" | "intermediate" | "advanced";

export interface Comment {
  id: string;
  text: string;
  createdAt: Date;
}

export interface PathFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status?: 'not-started' | 'in-progress' | 'completed';
  progress_data?: {
    reading_completed?: boolean;
    examples_completed?: boolean;
    visuals_completed?: boolean;
    completed_chapters?: number[];
    viewed_concepts?: number[];
    viewed_visuals?: number[];
  };
  labCount?: number;
  textCount?: number;
  slideCount?: number;
  audioCount?: number;
  mindmapCount?: number;
}

export interface LearningPath {
  id: string;
  title: string;
  description?: string;
  assignedTo: string[];
  comments: Comment[];
  status: PathStatus;
  createdAt: Date;
  dueDate?: Date | null;
  reminderDate?: Date | null;
  files?: PathFile[];
  modules?: Module[];
  learning_path_items?: any[];
  starred: boolean;
  difficulty?: Difficulty;
  estimatedDuration?: string; // Total path duration (e.g., "8-12 weeks", "40 hours")
}

export interface PathPosition {
  id: string;
  position: number;
}