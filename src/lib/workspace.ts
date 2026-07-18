import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User, Workspace } from "@prisma/client";
import {
  ALL_WORKSPACES,
  isWorkspace,
  type WorkspaceSelection,
} from "@/config/workspaces";

/** Cookie that persists the chosen workspace (SPEC §0). */
export const WORKSPACE_COOKIE = "keshv-workspace";

/**
 * Read the persisted workspace selection. Returns null when nothing valid
 * is stored — callers should then redirect to /select-workspace.
 * "ALL" is Admin-only; non-admins with a stale ALL cookie get null.
 */
export async function getWorkspaceSelection(
  user: User
): Promise<WorkspaceSelection | null> {
  const store = await cookies();
  const raw = store.get(WORKSPACE_COOKIE)?.value;
  if (!raw) return null;
  if (raw === ALL_WORKSPACES) return user.role === "ADMIN" ? ALL_WORKSPACES : null;
  return isWorkspace(raw) ? raw : null;
}

/** Like getWorkspaceSelection but redirects to the picker when unset. */
export async function requireWorkspace(user: User): Promise<WorkspaceSelection> {
  const selection = await getWorkspaceSelection(user);
  if (!selection) redirect("/select-workspace");
  return selection;
}

/**
 * Prisma `where` fragment filtering by the active workspace.
 * "ALL" applies no filter (combined admin view).
 */
export function workspaceFilter(
  selection: WorkspaceSelection
): { workspaceId: Workspace } | Record<string, never> {
  return selection === ALL_WORKSPACES ? {} : { workspaceId: selection };
}
