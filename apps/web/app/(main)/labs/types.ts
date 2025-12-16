import { EnumLabPriority, EnumLabStatus } from "./enum";

export type LabPriority = `${EnumLabPriority}`;
export type LabStatus = `${EnumLabStatus}`;
export type FilterTab = "all" | LabStatus;
export type ViewMode = "list" | "grid";
export type Difficulty = "intro" | "intermediate" | "advanced";
export type LabType = "concept" | "practice" | "exploration";

export interface Comment {
  id: string;
  text: string;
  createdAt: Date;
}

export interface LabFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface LabSection {
  id: string;
  title: string;
  completed: boolean;
}

export interface Lab {
  id: string;
  title: string;
  description?: string;
  assignedTo: string[];
  comments: Comment[];
  status: LabStatus;
  priority: LabPriority;
  createdAt: Date;
  dueDate?: Date | null;
  reminderDate?: Date | null;
  files?: LabFile[];
  subTasks?: LabSection[];
  starred: boolean;
  difficulty?: Difficulty;
  labType?: LabType;
  estimatedTime?: string;
}

export interface LabPosition {
  id: string;
  position: number;
}