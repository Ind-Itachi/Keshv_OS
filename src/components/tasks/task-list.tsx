"use client";

import { useMemo, useTransition } from "react";
import { CheckSquare, Lock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { TaskStatus } from "@prisma/client";
import type { TaskItem } from "@/lib/task-queries";
import {
  TASK_STATUSES,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
} from "@/lib/task-status";
import { PRIORITY_CLASSES, PRIORITY_LABELS } from "@/lib/stages";
import { daysUntil } from "@/lib/format";
import { setTaskStatus } from "@/app/(app)/tasks/actions";
import { QuickAdd } from "./quick-add";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type GroupBy = "status" | "assignee";
export type SortBy = "manual" | "dueDate" | "priority";

const PRIORITY_RANK = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

/** List view (SPEC §2.5): grouped by status or assignee, sortable. */
export function TaskList({
  tasks,
  groupBy,
  sortBy,
  canEdit,
  showProject,
  quickAddProjectId,
  onOpenTask,
}: {
  tasks: TaskItem[];
  groupBy: GroupBy;
  sortBy: SortBy;
  canEdit: boolean;
  showProject?: boolean;
  quickAddProjectId?: string | null;
  onOpenTask: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      if (sortBy === "dueDate")
        return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
      if (sortBy === "priority")
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      return a.order - b.order;
    });

    if (groupBy === "status") {
      return TASK_STATUSES.map((status) => ({
        key: status as string,
        label: TASK_STATUS_LABELS[status],
        dot: TASK_STATUS_COLORS[status],
        status: status as TaskStatus,
        tasks: sorted.filter((t) => t.status === status),
      }));
    }

    // Group by assignee (unassigned last).
    const names = new Map<string, TaskItem[]>();
    sorted.forEach((t) => {
      const key = t.assignee?.name ?? "Unassigned";
      names.set(key, [...(names.get(key) ?? []), t]);
    });
    return [...names.entries()]
      .sort(([a], [b]) =>
        a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)
      )
      .map(([name, list]) => ({
        key: name,
        label: name,
        dot: "bg-cobalt",
        status: undefined,
        tasks: list,
      }));
  }, [tasks, groupBy, sortBy]);

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        if (groupBy === "assignee" && group.tasks.length === 0) return null;
        return (
          <section key={group.key}>
            <div className="mb-2 flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", group.dot)} />
              <h2 className="text-sm font-semibold text-foreground">
                {group.label}
              </h2>
              <span className="text-xs text-muted-foreground">
                {group.tasks.length}
              </span>
            </div>

            <div className="divide-y rounded-xl border bg-card">
              {group.tasks.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  No tasks
                </p>
              )}
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  canEdit={canEdit}
                  showProject={showProject}
                  onOpen={() => onOpenTask(task.id)}
                />
              ))}
              {canEdit &&
                quickAddProjectId !== undefined &&
                group.status !== undefined && (
                  <div className="px-2 py-1.5">
                    <QuickAdd
                      projectId={quickAddProjectId}
                      status={group.status}
                    />
                  </div>
                )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TaskRow({
  task,
  canEdit,
  showProject,
  onOpen,
}: {
  task: TaskItem;
  canEdit: boolean;
  showProject?: boolean;
  onOpen: () => void;
}) {
  const [, startTransition] = useTransition();
  const overdue =
    task.dueDate && task.status !== "DONE" && daysUntil(task.dueDate) < 0;
  const done = task.subtasks.filter((s) => s.done).length;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50">
      {/* Status switcher */}
      <Select
        value={task.status}
        disabled={!canEdit}
        onValueChange={(status) =>
          startTransition(async () => {
            const result = await setTaskStatus(task.id, status as TaskStatus);
            if (result?.error) toast.error(result.error);
          })
        }
      >
        <SelectTrigger
          size="sm"
          className="h-7 w-32 shrink-0 border-0 bg-transparent shadow-none"
          onClick={(e) => e.stopPropagation()}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Title + meta — click opens the sheet */}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {task.isBlocked && <Lock className="h-3.5 w-3.5 shrink-0 text-copper" />}
        <span className="truncate text-sm font-medium">{task.title}</span>
        {showProject && task.projectName && (
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            · {task.projectName}
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        {task.labels.slice(0, 2).map((label) => (
          <span
            key={label}
            className="hidden rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium md:inline"
          >
            {label}
          </span>
        ))}

        {task.subtasks.length > 0 && (
          <span className="hidden items-center gap-0.5 sm:flex">
            <CheckSquare className="h-3 w-3" />
            {done}/{task.subtasks.length}
          </span>
        )}

        {task.comments.length > 0 && (
          <span className="hidden items-center gap-0.5 sm:flex">
            <MessageSquare className="h-3 w-3" />
            {task.comments.length}
          </span>
        )}

        {task.dueDate && (
          <span className={cn(overdue && "font-semibold text-health-red")}>
            {task.dueDate.slice(8, 10)}/{task.dueDate.slice(5, 7)}
          </span>
        )}

        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            PRIORITY_CLASSES[task.priority]
          )}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>

        {task.assignee && (
          <span
            title={task.assignee.name}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold"
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
