"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TaskStatus, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { TASK_STATUSES } from "@/lib/task-status";

/** Revalidate every view a task can appear in. */
function revalidateTaskViews(projectId?: string | null) {
  revalidatePath("/all-work");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/**
 * Access rule (SPEC §1): Admins touch everything; Members only tasks in
 * projects they belong to (standalone studio tasks are open to all members);
 * Viewers mutate nothing.
 */
async function canMutateTask(
  user: User,
  task: { projectId: string | null }
): Promise<boolean> {
  if (user.role === "VIEWER") return false;
  if (user.role === "ADMIN") return true;
  if (!task.projectId) return true; // studio task
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId: user.id },
    },
  });
  return !!membership;
}

/** Load a task and verify the current user may mutate it. */
async function getMutableTask(id: string) {
  const user = await requireUser();
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.deletedAt) return { user, task: null };
  if (!(await canMutateTask(user, task))) return { user, task: null };
  return { user, task };
}

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  projectId: z.string().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  estimateHrs: z.string().optional(),
  labels: z.string().optional(), // comma-separated
});

export type TaskFormState = { error?: string } | undefined;

function parseDate(value?: string): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00+05:30`);
}

function parseLabels(value?: string): string[] {
  return [...new Set((value ?? "").split(",").map((l) => l.trim()).filter(Boolean))];
}

/** Quick-add: title + column + optional project. */
export async function quickAddTask(input: {
  title: string;
  projectId?: string | null;
  status?: TaskStatus;
}) {
  const user = await requireUser();
  if (user.role === "VIEWER") return;
  const title = input.title.trim();
  if (!title) return;
  if (!(await canMutateTask(user, { projectId: input.projectId ?? null }))) return;

  // Place at the bottom of the target column.
  const last = await prisma.task.aggregate({
    where: { projectId: input.projectId ?? null, status: input.status ?? "TODO" },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      title,
      projectId: input.projectId ?? null,
      status: input.status ?? "TODO",
      order: (last._max.order ?? 0) + 1,
    },
  });

  await logActivity({
    actorId: user.id,
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    meta: { title: task.title },
  });

  revalidateTaskViews(task.projectId);
}

/** Full create from the task form dialog. */
export async function createTask(
  _prev: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const user = await requireUser();
  if (user.role === "VIEWER") return { error: "Viewers cannot create tasks." };

  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const projectId = data.projectId || null;

  if (!(await canMutateTask(user, { projectId })))
    return { error: "You are not a member of that project." };

  const last = await prisma.task.aggregate({
    where: { projectId, status: data.status },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      projectId,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId || null,
      dueDate: parseDate(data.dueDate),
      estimateHrs: data.estimateHrs ? Number(data.estimateHrs) : null,
      labels: parseLabels(data.labels),
      order: (last._max.order ?? 0) + 1,
    },
  });

  await logActivity({
    actorId: user.id,
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    meta: { title: task.title },
  });

  revalidateTaskViews(projectId);
}

/** Edit fields from the task sheet. */
export async function updateTask(
  id: string,
  _prev: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const { user, task } = await getMutableTask(id);
  if (!task) return { error: "Task not found or no access." };

  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  await prisma.task.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      assigneeId: data.assigneeId || null,
      dueDate: parseDate(data.dueDate),
      estimateHrs: data.estimateHrs ? Number(data.estimateHrs) : null,
      labels: parseLabels(data.labels),
    },
  });

  if (data.status !== task.status) {
    await setTaskStatus(id, data.status);
  }

  await logActivity({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Task",
    entityId: id,
    meta: { title: data.title },
  });

  revalidateTaskViews(task.projectId);
}

/**
 * Move a task to a status/position (kanban drop or list change).
 * Blocked tasks cannot be started (SPEC §2.4): moving beyond TODO is
 * rejected while any "blocked by" task is not done.
 */
export async function moveTask(
  id: string,
  status: TaskStatus,
  order?: number
): Promise<{ error?: string } | undefined> {
  const { user, task } = await getMutableTask(id);
  if (!task) return { error: "Task not found or no access." };
  if (!TASK_STATUSES.includes(status)) return { error: "Invalid status." };

  if (status !== "BACKLOG" && status !== "TODO") {
    const blockers = await prisma.taskDependency.findMany({
      where: { taskId: id },
      include: { blockedBy: { select: { status: true, deletedAt: true } } },
    });
    const blocked = blockers.some(
      (b) => !b.blockedBy.deletedAt && b.blockedBy.status !== "DONE"
    );
    if (blocked)
      return { error: "This task is blocked — finish its blocking task first." };
  }

  await prisma.task.update({
    where: { id },
    data: {
      status,
      ...(order !== undefined ? { order } : {}),
    },
  });

  if (status !== task.status) {
    await logActivity({
      actorId: user.id,
      action: "STATUS_CHANGE",
      entityType: "Task",
      entityId: id,
      meta: { from: task.status, to: status },
    });
  }

  revalidateTaskViews(task.projectId);
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  return moveTask(id, status);
}

/** Soft delete (Admin only, SPEC §1). */
export async function deleteTask(id: string) {
  const admin = await requireAdmin();
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;

  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });

  await logActivity({
    actorId: admin.id,
    action: "DELETE",
    entityType: "Task",
    entityId: id,
  });

  revalidateTaskViews(task.projectId);
}

// ---------------------------------------------------------------------------
// Subtasks (checklist)
// ---------------------------------------------------------------------------

export async function addSubtask(taskId: string, title: string) {
  const { task } = await getMutableTask(taskId);
  const trimmed = title.trim();
  if (!task || !trimmed) return;

  const last = await prisma.subtask.aggregate({
    where: { taskId },
    _max: { order: true },
  });
  await prisma.subtask.create({
    data: { taskId, title: trimmed, order: (last._max.order ?? 0) + 1 },
  });
  revalidateTaskViews(task.projectId);
}

export async function toggleSubtask(subtaskId: string) {
  const subtask = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: true },
  });
  if (!subtask) return;
  const { task } = await getMutableTask(subtask.taskId);
  if (!task) return;

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { done: !subtask.done },
  });
  revalidateTaskViews(task.projectId);
}

export async function deleteSubtask(subtaskId: string) {
  const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!subtask) return;
  const { task } = await getMutableTask(subtask.taskId);
  if (!task) return;

  await prisma.subtask.delete({ where: { id: subtaskId } });
  revalidateTaskViews(task.projectId);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/** Add a comment; @mentions matching user names are recorded for Phase 5. */
export async function addComment(taskId: string, body: string) {
  const user = await requireUser();
  if (user.role === "VIEWER") return;
  const trimmed = body.trim();
  if (!trimmed) return;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.deletedAt) return;

  // Extract @mentions by matching active user names (first name or full).
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const mentions = users
    .filter((u) => {
      const first = u.name.split(" ")[0].toLowerCase();
      const lower = trimmed.toLowerCase();
      return lower.includes(`@${first}`) || lower.includes(`@${u.name.toLowerCase()}`);
    })
    .map((u) => u.id);

  const comment = await prisma.comment.create({
    data: { taskId, authorId: user.id, body: trimmed, mentions },
  });

  await logActivity({
    actorId: user.id,
    action: "CREATE",
    entityType: "Comment",
    entityId: comment.id,
    meta: { taskId },
  });

  revalidateTaskViews(task.projectId);
}
