"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import type { TaskStatus } from "@prisma/client";
import type { TaskItem } from "@/lib/task-queries";
import {
  TASK_STATUSES,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
} from "@/lib/task-status";
import { moveTask } from "@/app/(app)/tasks/actions";
import { TaskCard } from "./task-card";
import { QuickAdd } from "./quick-add";
import { cn } from "@/lib/utils";

/**
 * Kanban board (SPEC §2.5): drag cards between status columns and reorder
 * within a column. Optimistic UI — the move applies instantly and reverts
 * with a toast if the server rejects it (e.g. blocked task).
 */
export function TaskBoard({
  tasks,
  canEdit,
  showProject,
  quickAddProjectId,
  onOpenTask,
}: {
  tasks: TaskItem[];
  canEdit: boolean;
  showProject?: boolean;
  /** Project to attach quick-added tasks to; undefined hides quick-add. */
  quickAddProjectId?: string | null;
  onOpenTask: (id: string) => void;
}) {
  // Local optimistic copy, re-synced whenever the server data changes.
  const [items, setItems] = useState(tasks);
  useEffect(() => setItems(tasks), [tasks]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, TaskItem[]>();
    TASK_STATUSES.forEach((s) => map.set(s, []));
    [...items]
      .sort((a, b) => a.order - b.order)
      .forEach((t) => map.get(t.status)?.push(t));
    return map;
  }, [items]);

  const activeTask = activeId ? items.find((t) => t.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = items.find((t) => t.id === taskId);
    if (!task) return;

    // Target: either a column ("col-STATUS") or another card.
    const overId = String(over.id);
    let targetStatus: TaskStatus;
    let targetIndex: number;

    if (overId.startsWith("col-")) {
      targetStatus = overId.slice(4) as TaskStatus;
      targetIndex = (byStatus.get(targetStatus) ?? []).length;
    } else {
      const overTask = items.find((t) => t.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
      targetIndex = (byStatus.get(targetStatus) ?? []).findIndex(
        (t) => t.id === overId
      );
    }

    // Compute a fractional order between the new neighbours.
    const column = (byStatus.get(targetStatus) ?? []).filter(
      (t) => t.id !== taskId
    );
    const before = column[targetIndex - 1];
    const after = column[targetIndex];
    let newOrder: number;
    if (!before && !after) newOrder = 1;
    else if (!before) newOrder = after.order - 1;
    else if (!after) newOrder = before.order + 1;
    else newOrder = (before.order + after.order) / 2;

    if (task.status === targetStatus && task.order === newOrder) return;

    // Optimistic update, then persist.
    const previous = items;
    setItems((current) =>
      current.map((t) =>
        t.id === taskId ? { ...t, status: targetStatus, order: newOrder } : t
      )
    );
    moveTask(taskId, targetStatus, newOrder).then((result) => {
      if (result?.error) {
        setItems(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={byStatus.get(status) ?? []}
            canEdit={canEdit}
            showProject={showProject}
            quickAddProjectId={quickAddProjectId}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-64 rotate-2 opacity-90">
            <TaskCard task={activeTask} showProject={showProject} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  status,
  tasks,
  canEdit,
  showProject,
  quickAddProjectId,
  onOpenTask,
}: {
  status: TaskStatus;
  tasks: TaskItem[];
  canEdit: boolean;
  showProject?: boolean;
  quickAddProjectId?: string | null;
  onOpenTask: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });

  return (
    <div className="flex w-64 shrink-0 flex-col rounded-xl bg-secondary/60">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className={cn("h-2 w-2 rounded-full", TASK_STATUS_COLORS[status])}
        />
        <span className="text-sm font-semibold">
          {TASK_STATUS_LABELS[status]}
        </span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-16 flex-1 flex-col gap-2 px-2 pb-2 transition-colors",
            isOver && "rounded-lg bg-primary/5"
          )}
        >
          {tasks.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              canEdit={canEdit}
              showProject={showProject}
              onOpenTask={onOpenTask}
            />
          ))}

          {canEdit && quickAddProjectId !== undefined && (
            <QuickAdd projectId={quickAddProjectId} status={status} />
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({
  task,
  canEdit,
  showProject,
  onOpenTask,
}: {
  task: TaskItem;
  canEdit: boolean;
  showProject?: boolean;
  onOpenTask: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: !canEdit });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        showProject={showProject}
        onClick={() => onOpenTask(task.id)}
      />
    </div>
  );
}
