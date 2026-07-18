"use client";

import { CheckSquare, Lock, MessageSquare } from "lucide-react";
import type { TaskItem } from "@/lib/task-queries";
import { PRIORITY_CLASSES, PRIORITY_LABELS } from "@/lib/stages";
import { daysUntil } from "@/lib/format";
import { WORKSPACES } from "@/config/workspaces";
import { cn } from "@/lib/utils";

/** Kanban card / shared task metadata row. */
export function TaskCard({
  task,
  showProject,
  onClick,
}: {
  task: TaskItem;
  showProject?: boolean;
  onClick?: () => void;
}) {
  const overdue =
    task.dueDate && task.status !== "DONE" && daysUntil(task.dueDate) < 0;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer space-y-2 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-1.5">
        {task.isBlocked && (
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-copper" />
        )}
        <p className="flex-1 text-sm font-medium leading-snug">{task.title}</p>
      </div>

      {showProject && task.projectName && (
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {task.workspace && (
            <span
              title={WORKSPACES[task.workspace].name}
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: WORKSPACES[task.workspace].primary }}
            />
          )}
          <span className="truncate">{task.projectName}</span>
        </p>
      )}

      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label}
              className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            PRIORITY_CLASSES[task.priority]
          )}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {task.dueDate && (
          <span className={cn(overdue && "font-semibold text-health-red")}>
            {task.dueDate.slice(8, 10)}/{task.dueDate.slice(5, 7)}
          </span>
        )}

        {task.subtasks.length > 0 && (
          <span className="flex items-center gap-0.5">
            <CheckSquare className="h-3 w-3" />
            {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
          </span>
        )}

        {task.comments.length > 0 && (
          <span className="flex items-center gap-0.5">
            <MessageSquare className="h-3 w-3" />
            {task.comments.length}
          </span>
        )}

        {task.assignee && (
          <span
            title={task.assignee.name}
            className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold"
          >
            {task.assignee.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
