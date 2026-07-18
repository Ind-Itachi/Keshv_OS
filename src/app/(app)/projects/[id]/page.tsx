import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatINR, deadlineCountdown, toDateInputValue, daysUntil } from "@/lib/format";
import { progressFromTasks, projectHealth } from "@/lib/project-health";
import { PRIORITY_CLASSES, PRIORITY_LABELS } from "@/lib/stages";
import { ProjectFormDialog, type ProjectFormValues } from "../project-form";
import { deleteProject } from "../actions";
import { StageControl } from "./stage-control";
import { StageBadge } from "@/components/stage-badge";
import { HealthDot } from "@/components/health-dot";
import { WorkspaceBadge } from "@/components/workspace-badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TasksView } from "@/components/tasks/tasks-view";
import { fetchTasks } from "@/lib/task-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Project detail — tabs per SPEC §2.3; Overview live, rest arrive later. */
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      createdBy: true,
      members: { include: { user: true } },
      tasks: { where: { deletedAt: null }, select: { status: true, dueDate: true } },
    },
  });

  if (!project || project.deletedAt) notFound();

  // Members may only open projects they're assigned to (SPEC §1).
  const isMemberOfProject = project.members.some((m) => m.userId === user.id);
  if (user.role !== "ADMIN" && !isMemberOfProject) notFound();

  const isAdmin = user.role === "ADMIN";
  const readOnly = user.role === "VIEWER";

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

  // Serialize for the edit dialog (Decimal → string, Date → yyyy-MM-dd).
  const formValues: ProjectFormValues = {
    id: project.id,
    name: project.name,
    workspaceId: project.workspaceId,
    clientId: project.clientId,
    serviceType: project.serviceType,
    description: project.description,
    priority: project.priority,
    startDate: toDateInputValue(project.startDate),
    deadline: toDateInputValue(project.deadline),
    budget: project.budget?.toString() ?? "",
    advanceReceived: project.advanceReceived,
    isRetainer: project.isRetainer,
    retainerHours: project.retainerHours,
    coverColor: project.coverColor,
    memberIds: project.members.map((m) => m.userId),
  };

  const [clients, users, taskItems] = await Promise.all([
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
    fetchTasks({ projectId: id }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div
        className="rounded-xl border bg-card p-5"
        style={{
          borderTopWidth: 4,
          borderTopColor: project.coverColor ?? "var(--primary)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-2xl">{project.name}</h1>
              <HealthDot health={health} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StageBadge stage={project.stage} />
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  PRIORITY_CLASSES[project.priority]
                )}
              >
                {PRIORITY_LABELS[project.priority]}
              </span>
              <WorkspaceBadge workspace={project.workspaceId} />
              {project.isRetainer && (
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-copper">
                  Retainer
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {project.client?.name ?? "No client"} · {project.serviceType} ·{" "}
              {deadlineCountdown(project.deadline)}
            </p>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1">
              <ProjectFormDialog
                project={formValues}
                clients={clients}
                users={users}
                isAdmin={isAdmin}
              />
              {isAdmin && (
                <ConfirmDelete
                  title={`Delete ${project.name}?`}
                  description="The project moves to Trash and can be restored within 30 days."
                  onConfirm={deleteProject.bind(null, project.id)}
                />
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <StageControl
            projectId={project.id}
            stage={project.stage}
            isAdmin={isAdmin}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Tabs (SPEC §2.3) */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{progress}%</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {done} of {total} tasks done
                  {total === 0 && " — tasks arrive in Phase 2"}
                </p>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <Row label="Start" value={formatDate(project.startDate)} />
                <Row label="Deadline" value={formatDate(project.deadline)} />
                <Row label="Delivered" value={formatDate(project.deliveredAt)} />
              </CardContent>
            </Card>

            {/* Budget — Admin only (SPEC §1) */}
            {isAdmin ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Budget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatINR(project.budget?.toString())}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Advance {project.advanceReceived ? "received ✓" : "not received"}
                  </p>
                  {project.isRetainer && (
                    <p className="text-xs text-muted-foreground">
                      Retainer bank: {project.retainerHours ?? 0} hrs/month
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TeamList members={project.members.map((m) => m.user.name)} />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Description */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {project.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No description yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <Row label="Client" value={project.client?.name ?? "—"} />
                <Row label="Service" value={project.serviceType} />
                <Row label="Created by" value={project.createdBy?.name ?? "—"} />
                <Row label="Created" value={formatDate(project.createdAt)} />
                {isAdmin && (
                  <div className="pt-2">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Team
                    </p>
                    <TeamList
                      members={project.members.map((m) => m.user.name)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <TasksView
            tasks={taskItems}
            users={users}
            projects={[]}
            canEdit={!readOnly}
            isAdmin={isAdmin}
            fixedProjectId={project.id}
          />
        </TabsContent>

        {(
          [
            ["files", "Files", 4],
            ["timeline", "Timeline", 5],
            ["activity", "Activity", 6],
            ["notes", "Notes", 6],
          ] as const
        ).map(([value, label, phase]) => (
          <TabsContent key={value} value={value} className="mt-4">
            <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              {label} arrive in Phase {phase} of the build plan.
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function TeamList({ members }: { members: string[] }) {
  if (members.length === 0)
    return <p className="text-sm text-muted-foreground">No one assigned yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {members.map((name) => (
        <span
          key={name}
          className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
