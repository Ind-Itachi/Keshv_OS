"use client";

import { useActionState, useEffect, useState } from "react";
import type { Priority, Workspace } from "@prisma/client";
import { Plus, Pencil } from "lucide-react";
import { WORKSPACES } from "@/config/workspaces";
import { PRIORITY_LABELS } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { createProject, updateProject, type ProjectFormState } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Preset cover colors (brand-adjacent palette). */
const COVER_COLORS = [
  "#c41e3a", "#1849a9", "#b87333", "#1a7f4e",
  "#6d28d9", "#0e7490", "#be185d", "#55585e",
];

export type ProjectFormValues = {
  id: string;
  name: string;
  workspaceId: Workspace;
  clientId: string | null;
  serviceType: string;
  description: string | null;
  priority: Priority;
  startDate: string; // yyyy-MM-dd or ""
  deadline: string;
  budget: string; // plain number string, "" when unset (admin only)
  advanceReceived: boolean;
  isRetainer: boolean;
  retainerHours: number | null;
  coverColor: string | null;
  memberIds: string[];
};

type Option = { id: string; name: string; workspace?: Workspace };

/**
 * Create/edit project dialog (SPEC §2.3 fields).
 * Service types + client list follow the selected workspace.
 */
export function ProjectFormDialog({
  project,
  clients,
  users,
  defaultWorkspace,
  isAdmin,
}: {
  project?: ProjectFormValues;
  clients: Option[];
  users: Option[];
  defaultWorkspace?: Workspace;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>(
    project?.workspaceId ?? defaultWorkspace ?? "KESHV"
  );
  const [isRetainer, setIsRetainer] = useState(project?.isRetainer ?? false);
  const [coverColor, setCoverColor] = useState(project?.coverColor ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(project?.memberIds ?? []);

  const action = project ? updateProject.bind(null, project.id) : createProject;
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(
    action,
    undefined
  );

  useEffect(() => {
    if (!pending && state === undefined) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const wsClients = clients.filter((c) => !c.workspace || c.workspace === workspace);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {project ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> New project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name *</Label>
            <Input id="name" name="name" required defaultValue={project?.name} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Workspace *</Label>
              <Select
                name="workspaceId"
                value={workspace}
                onValueChange={(v) => setWorkspace(v as Workspace)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(WORKSPACES).map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service type *</Label>
              <Select
                name="serviceType"
                key={workspace} // reset when workspace changes
                defaultValue={
                  project?.workspaceId === workspace ? project.serviceType : undefined
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose service" />
                </SelectTrigger>
                <SelectContent>
                  {WORKSPACES[workspace].serviceTypes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select name="clientId" defaultValue={project?.clientId ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  {wsClients.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No clients in this workspace
                    </div>
                  )}
                  {wsClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select name="priority" defaultValue={project?.priority ?? "MEDIUM"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={project?.description ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={project?.startDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">
                Deadline{" "}
                {project && !isAdmin && (
                  <span className="text-xs text-copper">(admin only)</span>
                )}
              </Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                defaultValue={project?.deadline}
                disabled={!!project && !isAdmin}
              />
              {/* Keep the value submitted when the input is disabled */}
              {project && !isAdmin && (
                <input type="hidden" name="deadline" value={project.deadline} />
              )}
            </div>
          </div>

          {/* Financial fields — Admin-visible only (SPEC §1) */}
          {isAdmin && (
            <div className="grid grid-cols-2 items-end gap-4 rounded-lg border bg-muted/40 p-3">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (₹)</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1,50,000"
                  defaultValue={project?.budget}
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <Checkbox
                  name="advanceReceived"
                  defaultChecked={project?.advanceReceived}
                />
                Advance received
              </label>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="isRetainer">Retainer project</Label>
              <p className="text-xs text-muted-foreground">
                Monthly hours bank instead of one-off delivery
              </p>
            </div>
            <Switch
              id="isRetainer"
              name="isRetainer"
              checked={isRetainer}
              onCheckedChange={setIsRetainer}
            />
          </div>
          {isRetainer && (
            <div className="space-y-2">
              <Label htmlFor="retainerHours">Monthly hours bank</Label>
              <Input
                id="retainerHours"
                name="retainerHours"
                type="number"
                min="0"
                step="0.5"
                defaultValue={project?.retainerHours ?? ""}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Team</Label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => {
                const selected = memberIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() =>
                      setMemberIds((ids) =>
                        selected ? ids.filter((i) => i !== u.id) : [...ids, u.id]
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
            <input type="hidden" name="memberIds" value={memberIds.join(",")} />
          </div>

          <div className="space-y-2">
            <Label>Cover color</Label>
            <div className="flex gap-2">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cover color ${color}`}
                  onClick={() => setCoverColor(coverColor === color ? "" : color)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    coverColor === color
                      ? "scale-110 border-foreground"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input type="hidden" name="coverColor" value={coverColor} />
          </div>

          {state?.error && (
            <p className="text-sm font-medium text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : project ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
