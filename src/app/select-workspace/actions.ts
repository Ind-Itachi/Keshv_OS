"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import { ALL_WORKSPACES, isWorkspace } from "@/config/workspaces";

/**
 * Persist the chosen workspace (cookie, 1 year) and enter the app.
 * "ALL" is restricted to Admins (SPEC §0).
 */
export async function selectWorkspace(selection: string) {
  const user = await requireUser();

  const valid =
    isWorkspace(selection) ||
    (selection === ALL_WORKSPACES && user.role === "ADMIN");
  if (!valid) redirect("/select-workspace");

  const store = await cookies();
  store.set(WORKSPACE_COOKIE, selection, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  redirect("/projects");
}
