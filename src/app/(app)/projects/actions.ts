"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ProjectStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ADMIN_ONLY_STAGES, PIPELINE_STAGES, SIDE_STAGES } from "@/lib/stages";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  workspaceId: z.enum(["KESHV", "SLATE"]),
  clientId: z.string().optional(),
  serviceType: z.string().trim().min(1, "Choose a service type"),
  description: z.string().trim().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  budget: z.string().optional(),
  advanceReceived: z.coerce.boolean().default(false),
  isRetainer: z.coerce.boolean().default(false),
  retainerHours: z.string().optional(),
  coverColor: z.string().optional(),
  memberIds: z.string().optional(), // comma-separated user ids
});

export type ProjectFormState = { error?: string } | undefined;

/** Parse "yyyy-MM-dd" from a date input as IST midnight. */
function parseDate(value?: string): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00+05:30`);
}

function parseMembers(value?: string): string[] {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const user = await requireUser();
  if (user.role === "VIEWER") return { error: "Viewers cannot create projects." };

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const project = await prisma.project.create({
    data: {
      name: data.name,
      workspaceId: data.workspaceId,
      clientId: data.clientId || null,
      serviceType: data.serviceType,
      description: data.description || null,
      priority: data.priority,
      startDate: parseDate(data.startDate),
      deadline: parseDate(data.deadline),
      // Financial fields are Admin-only (SPEC §1)
      budget: user.role === "ADMIN" && data.budget ? data.budget : null,
      advanceReceived: user.role === "ADMIN" ? data.advanceReceived : false,
      isRetainer: data.isRetainer,
      retainerHours:
        data.isRetainer && data.retainerHours ? Number(data.retainerHours) : null,
      coverColor: data.coverColor || null,
      createdById: user.id,
      members: {
        create: parseMembers(data.memberIds).map((userId) => ({ userId })),
      },
    },
  });

  await logActivity({
    actorId: user.id,
    action: "CREATE",
    entityType: "Project",
    entityId: project.id,
    meta: { name: project.name },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(
  id: string,
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const user = await requireUser();
  if (user.role === "VIEWER") return { error: "Viewers cannot edit projects." };

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return { error: "Project not found." };

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  // Only Admins may change deadlines (SPEC §1).
  const newDeadline = parseDate(data.deadline);
  const deadlineChanged =
    (newDeadline?.getTime() ?? null) !== (existing.deadline?.getTime() ?? null);
  if (deadlineChanged && user.role !== "ADMIN")
    return { error: "Only an Admin can change the deadline." };

  await prisma.project.update({
    where: { id },
    data: {
      name: data.name,
      workspaceId: data.workspaceId,
      clientId: data.clientId || null,
      serviceType: data.serviceType,
      description: data.description || null,
      priority: data.priority,
      startDate: parseDate(data.startDate),
      deadline: newDeadline,
      ...(user.role === "ADMIN"
        ? {
            budget: data.budget ? data.budget : null,
            advanceReceived: data.advanceReceived,
          }
        : {}),
      isRetainer: data.isRetainer,
      retainerHours:
        data.isRetainer && data.retainerHours ? Number(data.retainerHours) : null,
      coverColor: data.coverColor || null,
      members: {
        deleteMany: {},
        create: parseMembers(data.memberIds).map((userId) => ({ userId })),
      },
    },
  });

  await logActivity({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Project",
    entityId: id,
    meta: { name: data.name },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

/**
 * Move a project through the pipeline (SPEC §2.3).
 * DELIVERED / CLOSED are Admin-only; DELIVERED stamps deliveredAt.
 */
export async function changeStage(id: string, stage: ProjectStage) {
  const user = await requireUser();
  if (user.role === "VIEWER") return;

  const validStage =
    PIPELINE_STAGES.includes(stage) || SIDE_STAGES.includes(stage);
  if (!validStage) return;

  if (ADMIN_ONLY_STAGES.includes(stage) && user.role !== "ADMIN") return;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return;

  await prisma.project.update({
    where: { id },
    data: {
      stage,
      deliveredAt:
        stage === "DELIVERED" ? new Date() : existing.deliveredAt,
    },
  });

  await logActivity({
    actorId: user.id,
    action: "STAGE_CHANGE",
    entityType: "Project",
    entityId: id,
    meta: { from: existing.stage, to: stage },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

/** Soft delete (Admin only) — recoverable from Trash for 30 days. */
export async function deleteProject(id: string) {
  const admin = await requireAdmin();

  await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    actorId: admin.id,
    action: "DELETE",
    entityType: "Project",
    entityId: id,
  });

  revalidatePath("/projects");
  redirect("/projects");
}
