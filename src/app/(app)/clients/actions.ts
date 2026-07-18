"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  company: z.string().trim().optional(),
  email: z.union([z.literal(""), z.string().trim().email("Invalid email")]).optional(),
  phone: z.string().trim().optional(),
  workspace: z.enum(["KESHV", "SLATE"]),
});

export type ClientFormState = { error?: string } | undefined;

export async function createClientRecord(
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const user = await requireUser();
  if (user.role === "VIEWER") return { error: "Viewers cannot create clients." };

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { workspace, email, ...rest } = parsed.data;
  const client = await prisma.client.create({
    data: { ...rest, email: email || null, workspace },
  });

  await logActivity({
    actorId: user.id,
    action: "CREATE",
    entityType: "Client",
    entityId: client.id,
    meta: { name: client.name },
  });

  revalidatePath("/clients");
}

export async function updateClientRecord(
  id: string,
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const user = await requireUser();
  if (user.role === "VIEWER") return { error: "Viewers cannot edit clients." };

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { workspace, email, ...rest } = parsed.data;
  await prisma.client.update({
    where: { id },
    data: { ...rest, email: email || null, workspace },
  });

  await logActivity({
    actorId: user.id,
    action: "UPDATE",
    entityType: "Client",
    entityId: id,
    meta: { name: rest.name },
  });

  revalidatePath("/clients");
}

/** Soft delete (Admin only) — recoverable from Trash for 30 days. */
export async function deleteClientRecord(id: string) {
  const admin = await requireAdmin();

  await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    actorId: admin.id,
    action: "DELETE",
    entityType: "Client",
    entityId: id,
  });

  revalidatePath("/clients");
}
