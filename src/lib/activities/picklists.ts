// Jeux conçus pour le statut et la priorité d'une tâche (architecture §3.5).
import type { TaskPriority, TaskStatus } from "@prisma/client";

export const PARENT_TYPES = ["Account", "Contact", "Lead", "Opportunity"] as const;
export type ParentType = (typeof PARENT_TYPES)[number];

export const TASK_STATUSES = ["NotStarted", "InProgress", "Completed"] as const satisfies readonly TaskStatus[];
export const TASK_PRIORITIES = ["Low", "Normal", "High"] as const satisfies readonly TaskPriority[];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NotStarted: "Not Started",
  InProgress: "In Progress",
  Completed: "Completed",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  Low: "Low",
  Normal: "Normal",
  High: "High",
};

export const isParentType = (value: string): value is ParentType => (PARENT_TYPES as readonly string[]).includes(value);
export const isTaskStatus = (value: string): value is TaskStatus => (TASK_STATUSES as readonly string[]).includes(value);
export const isTaskPriority = (value: string): value is TaskPriority => (TASK_PRIORITIES as readonly string[]).includes(value);
