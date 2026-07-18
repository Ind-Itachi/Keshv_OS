import type { TaskStatus } from "@prisma/client";

/** Kanban/list column order (SPEC §2.4). */
export const TASK_STATUSES: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

/** Column accent dot per status. */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  BACKLOG: "bg-muted-foreground/40",
  TODO: "bg-cobalt",
  IN_PROGRESS: "bg-copper",
  IN_REVIEW: "bg-crimson",
  DONE: "bg-health-green",
};
