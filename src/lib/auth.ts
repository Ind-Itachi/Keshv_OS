import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the current app user: Supabase session → Prisma User (by email).
 *
 * Bootstrap rule: the very first person to sign in becomes ADMIN
 * automatically (so the founders can get in before any invites exist).
 * After that, only emails that exist in the User table may enter —
 * Admins add teammates from Settings → Users.
 *
 * Cached per-request so layouts/pages can call it freely.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  const email = authUser.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.isActive ? existing : null;

  // First-ever user bootstraps as ADMIN.
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    return prisma.user.create({
      data: {
        email,
        name:
          (authUser.user_metadata?.full_name as string | undefined) ??
          email.split("@")[0],
        role: "ADMIN",
      },
    });
  }

  // Signed in with Supabase but not invited to the app.
  return null;
});

/** Require a signed-in, active app user or bounce to /login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require ADMIN role or bounce to the projects list. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/projects");
  return user;
}
