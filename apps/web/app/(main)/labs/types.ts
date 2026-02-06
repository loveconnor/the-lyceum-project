import { UnifiedLabData } from "@/types/lab-templates";

export type LabStatus = "not-started" | "in-progress" | "completed";
export type FilterTab = "all" | LabStatus;
export type ViewMode = "list" | "grid";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type LabTemplateType = "analyze" | "build" | "derive" | "explain" | "explore" | "revise";

export interface Comment {
  id: string;
  text: string;
  created_at: string;
}

export interface LabProgress {
  id: string;
  step_id: string;
  step_data?: unknown;
  completed: boolean;
  updated_at: string;
}

export interface Lab {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  template_type: LabTemplateType;
  template_data: UnifiedLabData;
  status: LabStatus;
  difficulty?: Difficulty;
  estimated_duration?: number; // in minutes
  topics?: string[];
  starred: boolean;
  created_at: string;
  updated_at: string;
  due_date?: string | null;
  completed_at?: string | null;
  generation_constraint?: string;
  lab_comments?: Comment[];
  lab_progress?: LabProgress[];
  path_id?: string | null; // If part of a learning path
  path_title?: string | null; // Title of the learning path
}
