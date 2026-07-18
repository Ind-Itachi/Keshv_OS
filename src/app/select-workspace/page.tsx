import { requireUser } from "@/lib/auth";
import { WORKSPACES } from "@/config/workspaces";
import { selectWorkspace } from "./actions";
import { Building2 } from "lucide-react";

/**
 * Workspace Picker — first screen after login (SPEC §0).
 * Two large branded cards; Admins get a third "All Workspaces" option.
 */
export default async function SelectWorkspacePage() {
  const user = await requireUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <p className="mb-2 text-sm text-muted-foreground">
        Welcome back, {user.name}
      </p>
      <h1 className="mb-10 text-3xl">Choose your workspace</h1>

      <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        {Object.values(WORKSPACES).map((ws) => (
          <form key={ws.id} action={selectWorkspace.bind(null, ws.id)}>
            <button
              type="submit"
              className="group w-full rounded-2xl border bg-card p-8 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2"
              style={{ borderTopWidth: 4, borderTopColor: ws.primary }}
            >
              <span
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold text-white"
                style={{ backgroundColor: ws.primary }}
              >
                {ws.initials}
              </span>
              <span className="block text-xl font-semibold text-foreground">
                {ws.name}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {ws.tagline}
              </span>
            </button>
          </form>
        ))}
      </div>

      {user.role === "ADMIN" && (
        <form action={selectWorkspace.bind(null, "ALL")} className="mt-6">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg border bg-card px-5 py-3 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            <Building2 className="h-4 w-4" />
            All Workspaces
            <span className="rounded bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-copper">
              Admin
            </span>
          </button>
        </form>
      )}
    </main>
  );
}
