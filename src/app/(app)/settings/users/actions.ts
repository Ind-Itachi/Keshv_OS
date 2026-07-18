"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export type UserFormState = { error?: string } | undefined;

/**
 * Add a teammate (Admin only). This creates the app-side user record; the
 * matching Supabase Auth account is created from the Supabase dashboard
 * (Authentication → Users → Invite) with the same email.
 */
export async function addUser(
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const admin = await requireAdmin();

  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) return { error: "A user with that email already exists." };

  const user = await prisma.user.create({ data: parsed.data });

  await logActivity({
    actorId: admin.id,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    meta: { email: user.email, role: user.role },
  });

  revalidatePath("/settings/users");
}

/** Change a user's role (Admin only). Admins cannot demote themselves. */
export async function changeUserRole(userId: string, role: string) {
  const admin = await requireAdmin();
  const parsed = z.enum(["ADMIN", "MEMBER", "VIEWER"]).safeParse(role);
  if (!parsed.success || userId === admin.id) return;

  await prisma.user.update({ where: { id: userId }, data: { role: parsed.data } });

  await logActivity({
    actorId: admin.id,
    action: "UPDATE",
    entityType: "User",
    entityId: userId,
    meta: { role: parsed.data },
  });

  revalidatePath("/settings/users");
}

/** Deactivate / reactivate a user (Admin only, not yourself). */
export async function toggleUserActive(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  await logActivity({
    actorId: admin.id,
    action: "UPDATE",
    entityType: "User",
    entityId: userId,
    meta: { isActive: !user.isActive },
  });

  revalidatePath("/settings/users");
}
