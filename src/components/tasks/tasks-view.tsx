"use client";

import { useState } from "react";
import { LayoutList, SquareKanban } from "lucide-react";
import type { TaskItem } from "@/lib/task-queries";
import { TaskBoard } from "./task-board";
import { TaskList, type GroupBy, type SortBy } from "./task-list";
import { TaskSheet, type UserOption } from "./task-sheet";
import { TaskFormDialog, type ProjectOption } from "./task-form-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Complete tasks UI: toolbar (view switcher, grouping, sort, new task),
 * List/Kanban views and the task detail sheet. Used by both the project
 * Tasks tab and the global All Work page (SPEC §2.5).
 */
export function TasksView({
  tasks,
  users,
  projects,
  canEdit,
  isAdmin,
  showProject = false,
  fixedProjectId,
}: {
  tasks: TaskItem[];
  users: UserOption[];
  projects: ProjectOption[];
  canEdit: boolean;
  isAdmin: boolean;
  /** Show the project name on cards/rows (All Work mode). */
  showProject?: boolean;
  /** Scope everything to one project (project Tasks tab). */
  fixedProjectId?: string;
}) {
  const [view, setView] = useState<"list" | "board">("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [sortBy, setSortBy] = useState<SortBy>("manual");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const openTask = openTaskId
    ? (tasks.find((t) => t.id === openTaskId) ?? null)
    : null;

  // Quick-add target: the fixed project on a project tab, studio tasks
  // (no project) on All Work.
  const quickAddProjectId = fixedProjectId ?? null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border bg-card p-0.5">
          <ViewButton
            active={view === "list"}
            onClick={() => setView("list")}
            icon={LayoutList}
            label="List"
          />
          <ViewButton
            active={view === "board"}
            onClick={() => setView("board")}
            icon={SquareKanban}
            label="Board"
          />
        </div>

        {view === "list" && (
          <>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Group: Status</SelectItem>
                <SelectItem value="assignee">Group: Assignee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Sort: Manual</SelectItem>
                <SelectItem value="dueDate">Sort: Due date</SelectItem>
                <SelectItem value="priority">Sort: Priority</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {canEdit && (
          <div className="ml-auto">
            <TaskFormDialog
              users={users}
              projects={projects}
              fixedProjectId={fixedProjectId}
            />
          </div>
        )}
      </div>

      {/* Active view */}
      {view === "board" ? (
        <TaskBoard
          tasks={tasks}
          canEdit={canEdit}
          showProject={showProject}
          quickAddProjectId={canEdit ? quickAddProjectId : undefined}
          onOpenTask={setOpenTaskId}
        />
      ) : (
        <TaskList
          tasks={tasks}
          groupBy={groupBy}
          sortBy={sortBy}
          canEdit={canEdit}
          showProject={showProject}
          quickAddProjectId={canEdit ? quickAddProjectId : undefined}
          onOpenTask={setOpenTaskId}
        />
      )}

      <TaskSheet
        task={openTask}
        users={users}
        open={!!openTask}
        onOpenChange={(open) => !open && setOpenTaskId(null)}
        canEdit={canEdit}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
