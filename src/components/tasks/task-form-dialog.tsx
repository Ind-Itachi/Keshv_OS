"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createTask, type TaskFormState } from "@/app/(app)/tasks/actions";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/task-status";
import { PRIORITY_LABELS } from "@/lib/stages";
import type { UserOption } from "./task-sheet";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ProjectOption = { id: string; name: string };

/**
 * Full "New task" dialog (SPEC §2.4 fields). When `fixedProjectId` is set
 * (project Tasks tab) the project picker is hidden; otherwise the task can
 * target any listed project or none ("Studio task").
 */
export function TaskFormDialog({
  users,
  projects,
  fixedProjectId,
}: {
  users: UserOption[];
  projects: ProjectOption[];
  fixedProjectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(
    createTask,
    undefined
  );

  useEffect(() => {
    if (!pending && state === undefined) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required autoFocus />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          {fixedProjectId ? (
            <input type="hidden" name="projectId" value={fixedProjectId} />
          ) : (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select name="projectId">
                <SelectTrigger>
                  <SelectValue placeholder="Studio task (no project)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue="TODO">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select name="priority" defaultValue="MEDIUM">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select name="assigneeId">
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimateHrs">Estimate (hrs)</Label>
              <Input
                id="estimateHrs"
                name="estimateHrs"
                type="number"
                min="0"
                step="0.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labels">Labels</Label>
              <Input id="labels" name="labels" placeholder="design, social" />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm font-medium text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
