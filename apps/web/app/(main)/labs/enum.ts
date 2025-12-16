export enum EnumLabPriority {
  High = "high",
  Medium = "medium",
  Low = "low"
}

export enum EnumLabStatus {
  Pending = "pending",
  InProgress = "in-progress",
  Completed = "completed"
}

export const priorityClasses: Record<EnumLabPriority, string> = {
  [EnumLabPriority.High]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  [EnumLabPriority.Medium]:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  [EnumLabPriority.Low]: "bg-gray-200 text-green-80 dark:bg-gray-700 dark:text-gray-200"
};

export const priorityDotColors: Record<EnumLabPriority, string> = {
  [EnumLabPriority.High]: "bg-red-500",
  [EnumLabPriority.Medium]: "bg-yellow-500",
  [EnumLabPriority.Low]: "bg-gray-400"
};

export const statusClasses: Record<EnumLabStatus, string> = {
  [EnumLabStatus.Pending]: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  [EnumLabStatus.InProgress]:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  [EnumLabStatus.Completed]: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
};

export const labStatusNamed: Record<EnumLabStatus, string> = {
  [EnumLabStatus.Pending]: "Not Started",
  [EnumLabStatus.InProgress]: "In Progress",
  [EnumLabStatus.Completed]: "Mastered"
};

export const statusDotColors: Record<EnumLabStatus, string> = {
  [EnumLabStatus.Pending]: "bg-blue-500",
  [EnumLabStatus.InProgress]: "bg-purple-500",
  [EnumLabStatus.Completed]: "bg-green-500"
};