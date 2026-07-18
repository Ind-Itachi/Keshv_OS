import { requireUser } from "@/lib/auth";
import { requireWorkspace, workspaceFilter } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { WORKSPACES, ALL_WORKSPACES } from "@/config/workspaces";
import { fetchTasks } from "@/lib/task-queries";
import { TasksView } from "@/components/tasks/tasks-view";

export const dynamic = "force-dynamic";

/**
 * All Work (SPEC §2.5): every task across the active workspace in List or
 * Kanban form, plus standalone "Studio tasks". Members only see tasks from
 * projects they belong to (SPEC §1).
 */
export default async function AllWorkPage() {
  const user = await requireUser();
  const workspace = await requireWorkspace(user);

  const projectScope = {
    deletedAt: null,
    ...workspaceFilter(workspace),
    ...(user.role === "ADMIN" ? {} : { members: { some: { userId: user.id } } }),
  };

  const [tasks, projects] = await Promise.all([
    // Project tasks in scope + studio tasks (studio ops are cross-workspace).
    fetchTasks({
      OR: [{ project: { is: projectScope } }, { projectId: null }],
    }),
    prisma.project.findMany({
      where: projectScope,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl">All Work</h1>
        <p className="text-sm text-muted-foreground">
          {workspace === ALL_WORKSPACES
            ? "All workspaces"
            : WORKSPACES[workspace].name}{" "}
          · {tasks.length} tasks
        </p>
      </div>

      <TasksView
        tasks={tasks}
        users={users}
        projects={projects}
        canEdit={user.role !== "VIEWER"}
        isAdmin={user.role === "ADMIN"}
        showProject
      />
    </div>
  );
}
