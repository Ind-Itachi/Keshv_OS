import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { requireWorkspace, workspaceFilter } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { WORKSPACES, ALL_WORKSPACES } from "@/config/workspaces";
import { deadlineCountdown, daysUntil } from "@/lib/format";
import { projectHealth, progressFromTasks } from "@/lib/project-health";
import { PRIORITY_CLASSES, PRIORITY_LABELS } from "@/lib/stages";
import { ProjectFormDialog } from "./project-form";
import { StageBadge } from "@/components/stage-badge";
import { HealthDot } from "@/components/health-dot";
import { WorkspaceBadge } from "@/components/workspace-badge";
import { FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Projects — card grid scoped to the active workspace (SPEC §2.3). */
export default async function ProjectsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspace(user);

  // Members see only projects they're assigned to (SPEC §1).
  const memberScope =
    user.role === "ADMIN"
      ? {}
      : { members: { some: { userId: user.id } } };

  const [projects, clients, users] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null, ...workspaceFilter(workspace), ...memberScope },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        client: true,
        members: { include: { user: true } },
        tasks: {
          where: { deletedAt: null },
          select: { status: true, dueDate: true },
        },
      },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, workspace: true },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const canCreate = user.role !== "VIEWER";
  const showWorkspaceBadge = workspace === ALL_WORKSPACES;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {workspace === ALL_WORKSPACES
              ? "All workspaces"
              : WORKSPACES[workspace].name}{" "}
            · {projects.length} active
          </p>
        </div>
        {canCreate && (
          <ProjectFormDialog
            clients={clients}
            users={users}
            defaultWorkspace={workspace === ALL_WORKSPACES ? undefined : workspace}
            isAdmin={user.role === "ADMIN"}
          />
        )}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
          <FolderKanban className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No projects yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Create your first project — it starts at the Enquiry stage and
            moves through the pipeline to Delivered.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const total = project.tasks.length;
            const done = project.tasks.filter((t) => t.status === "DONE").length;
            const progress = progressFromTasks(total, done);
            const hasOverdueTask = project.tasks.some(
              (t) => t.status !== "DONE" && t.dueDate && daysUntil(t.dueDate) < 0
            );
            const health = projectHealth({
              deadline: project.deadline,
              progress,
              hasOverdueTask,
              stage: project.stage,
            });
            const overdue =
              project.deadline &&
              daysUntil(project.deadline) < 0 &&
              !["DELIVERED", "CLOSED", "LOST"].includes(project.stage);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Cover strip */}
                <div
                  className="h-1.5"
                  style={{
                    backgroundColor:
                      project.coverColor ??
                      WORKSPACES[project.workspaceId].primary,
                  }}
                />
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {project.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {project.client?.name ?? "No client"}
                      </p>
                    </div>
                    <HealthDot health={health} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <StageBadge stage={project.stage} />
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        PRIORITY_CLASSES[project.priority]
                      )}
                    >
                      {PRIORITY_LABELS[project.priority]}
                    </span>
                    {showWorkspaceBadge && (
                      <WorkspaceBadge workspace={project.workspaceId} />
                    )}
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {done}/{total} tasks
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <p
                    className={cn(
                      "text-xs",
                      overdue ? "font-medium text-health-red" : "text-muted-foreground"
                    )}
                  >
                    {deadlineCountdown(project.deadline)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
