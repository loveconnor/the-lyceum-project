export enum EnumPathStatus {
  NotStarted = "not-started",
  InProgress = "in-progress",
  Completed = "completed"
}

export const statusClasses: Record<EnumPathStatus, string> = {
  [EnumPathStatus.NotStarted]: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  [EnumPathStatus.InProgress]:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  [EnumPathStatus.Completed]: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
};

export const pathStatusNamed: Record<EnumPathStatus, string> = {
  [EnumPathStatus.NotStarted]: "Not Started",
  [EnumPathStatus.InProgress]: "In Progress",
  [EnumPathStatus.Completed]: "Completed"
};

export const statusDotColors: Record<EnumPathStatus, string> = {
  [EnumPathStatus.NotStarted]: "bg-blue-500",
  [EnumPathStatus.InProgress]: "bg-purple-500",
  [EnumPathStatus.Completed]: "bg-green-500"
};