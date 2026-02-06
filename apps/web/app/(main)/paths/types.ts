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

export interface WebSource {
  name: string;
  url?: string;
  logo_url?: string;
  source_type?: string;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status?: 'not-started' | 'in-progress' | 'completed';
  content_mode?: 'ai_generated' | 'registry_backed' | 'learn_by_doing';
  generation_constraint?: string;
  content_data?: Record<string, unknown> | null;
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

export interface PathItem {
  id: string;
  path_id: string;
  lab_id?: string | null;
  order_index: number;
  title: string;
  description?: string;
  item_type: 'lab' | 'module' | 'reading' | 'video' | 'quiz' | 'project';
  status: 'not-started' | 'in-progress' | 'completed';
  completed_at?: string | null;
  generation_constraint?: string;
  content_data?: Record<string, unknown> | null;
  content_mode?: 'ai_generated' | 'registry_backed' | 'learn_by_doing';
  source_asset_id?: string | null;
  source_node_ids?: string[];
  content_unavailable?: boolean;
  last_resolved_at?: string | null;
  uses_visual_aids?: boolean; // NEW: Flag indicating module benefits from visual enrichment
  labs?: {
    id: string;
    title: string;
    description?: string;
    status: string;
    difficulty?: string;
    estimated_duration?: number;
  };
}

/**
 * Illustrative visual aid (NOT a source of truth)
 * These are supplemental diagrams/illustrations to help understanding
 */
export interface IllustrativeVisual {
  type: 'illustrative_image';
  src: string;
  alt: string;
  caption: string;
  usage_label: 'illustrative'; // ALWAYS "illustrative" - not authoritative
  attribution?: string;
  thumbnail_src?: string;
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
  learning_path_items?: PathItem[];
  starred: boolean;
  difficulty?: Difficulty;
  estimated_duration?: number; // Duration in minutes from database
  estimatedDuration?: string; // Legacy: Total path duration (e.g., "8-12 weeks", "40 hours")
  generation_constraint?: string;
  web_sources?: WebSource[];
}

export interface PathPosition {
  id: string;
  position: number;
}
