import type { Prisma, Priority, TaskStatus, Workspace } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDateInputValue, formatDateTime } from "@/lib/format";

/** Serializable task shape shared by the List/Kanban views and task sheet. */
export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  order: number;
  dueDate: string; // yyyy-MM-dd or ""
  estimateHrs: number | null;
  labels: string[];
  projectId: string | null;
  projectName: string | null;
  workspace: Workspace | null;
  assignee: { id: string; name: string } | null;
  isBlocked: boolean;
  subtasks: { id: string; title: string; done: boolean }[];
  comments: {
    id: string;
    body: string;
    authorName: string;
    createdAt: string; // preformatted IST
  }[];
};

/**
 * Fetch tasks (with everything the UI needs) for any `where` scope —
 * a single project, a workspace, or the member's assigned projects.
 */
export async function fetchTasks(
  where: Prisma.TaskWhereInput
): Promise<TaskItem[]> {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null, ...where },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      project: { select: { id: true, name: true, workspaceId: true } },
      assignee: { select: { id: true, name: true } },
      subtasks: { orderBy: { order: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
      blockedBy: {
        include: { blockedBy: { select: { status: true, deletedAt: true } } },
      },
    },
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    order: t.order,
    dueDate: toDateInputValue(t.dueDate),
    estimateHrs: t.estimateHrs,
    labels: t.labels,
    projectId: t.project?.id ?? null,
    projectName: t.project?.name ?? null,
    workspace: t.project?.workspaceId ?? null,
    assignee: t.assignee,
    isBlocked: t.blockedBy.some(
      (d) => !d.blockedBy.deletedAt && d.blockedBy.status !== "DONE"
    ),
    subtasks: t.subtasks.map((s) => ({ id: s.id, title: s.title, done: s.done })),
    comments: t.comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorName: c.author.name,
      createdAt: formatDateTime(c.createdAt),
    })),
  }));
}
