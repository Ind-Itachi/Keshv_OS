"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Lock, Send, X } from "lucide-react";
import type { TaskItem } from "@/lib/task-queries";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/task-status";
import { PRIORITY_LABELS } from "@/lib/stages";
import {
  updateTask,
  deleteTask,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  addComment,
  type TaskFormState,
} from "@/app/(app)/tasks/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type UserOption = { id: string; name: string };

/**
 * Task detail slide-over (SPEC §2.4): fields, checklist (subtasks) and
 * comment thread. Read-only for Viewers; delete is Admin-only.
 */
export function TaskSheet({
  task,
  users,
  open,
  onOpenChange,
  canEdit,
  isAdmin,
}: {
  task: TaskItem | null;
  users: UserOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  if (!task) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 pr-6 text-left">
            {task.isBlocked && <Lock className="h-4 w-4 shrink-0 text-copper" />}
            <span className="truncate">{task.title}</span>
          </SheetTitle>
          {task.projectName && (
            <p className="text-left text-xs text-muted-foreground">
              {task.projectName}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-6 px-5 py-4">
          {task.isBlocked && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs font-medium text-copper">
              Blocked — this task can&apos;t be started until its blocking task
              is done.
            </p>
          )}

          <TaskFields task={task} users={users} canEdit={canEdit} />
          <SubtaskList task={task} canEdit={canEdit} />
          <CommentThread task={task} canEdit={canEdit} />
        </div>

        {isAdmin && (
          <div className="flex items-center justify-between border-t px-5 py-3">
            <span className="text-xs text-muted-foreground">
              Deleting moves the task to Trash (30-day recovery).
            </span>
            <ConfirmDelete
              title={`Delete "${task.title}"?`}
              description="The task moves to Trash and can be restored within 30 days."
              onConfirm={async () => {
                await deleteTask(task.id);
                onOpenChange(false);
              }}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Editable field form — saves via the updateTask server action. */
function TaskFields({
  task,
  users,
  canEdit,
}: {
  task: TaskItem;
  users: UserOption[];
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(
    updateTask.bind(null, task.id),
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={task.title}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={task.description ?? ""}
          disabled={!canEdit}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select name="status" defaultValue={task.status} disabled={!canEdit}>
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
          <Select name="priority" defaultValue={task.priority} disabled={!canEdit}>
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
          <Select
            name="assigneeId"
            defaultValue={task.assignee?.id}
            disabled={!canEdit}
          >
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
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={task.dueDate}
            disabled={!canEdit}
          />
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
            defaultValue={task.estimateHrs ?? ""}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="labels">Labels</Label>
          <Input
            id="labels"
            name="labels"
            placeholder="design, urgent-fix"
            defaultValue={task.labels.join(", ")}
            disabled={!canEdit}
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      )}

      {canEdit && (
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      )}
    </form>
  );
}

/** Checklist (SPEC §2.4 subtasks). */
function SubtaskList({ task, canEdit }: { task: TaskItem; canEdit: boolean }) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const done = task.subtasks.filter((s) => s.done).length;

  return (
    <div className="space-y-2">
      <Label>
        Checklist{" "}
        {task.subtasks.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            {done}/{task.subtasks.length}
          </span>
        )}
      </Label>

      <ul className="space-y-1">
        {task.subtasks.map((subtask) => (
          <li
            key={subtask.id}
            className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-accent"
          >
            <Checkbox
              checked={subtask.done}
              disabled={!canEdit}
              onCheckedChange={() =>
                startTransition(() => toggleSubtask(subtask.id))
              }
            />
            <span
              className={
                subtask.done
                  ? "flex-1 text-sm text-muted-foreground line-through"
                  : "flex-1 text-sm"
              }
            >
              {subtask.title}
            </span>
            {canEdit && (
              <button
                type="button"
                aria-label="Remove subtask"
                className="invisible text-muted-foreground hover:text-destructive group-hover:visible"
                onClick={() => startTransition(() => deleteSubtask(subtask.id))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            const value = title;
            setTitle("");
            startTransition(() => addSubtask(task.id, value));
          }}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a checklist item…"
            className="h-8"
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Add
          </Button>
        </form>
      )}
    </div>
  );
}

/** Comment thread (SPEC §2.4). @first-name mentions are recorded. */
function CommentThread({ task, canEdit }: { task: TaskItem; canEdit: boolean }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [task.comments.length]);

  return (
    <div className="space-y-2">
      <Label>Comments</Label>

      <div className="max-h-64 space-y-3 overflow-y-auto">
        {task.comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
        {task.comments.map((comment) => (
          <div key={comment.id} className="rounded-lg bg-secondary p-3">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold">{comment.authorName}</span>
              <span className="text-[10px] text-muted-foreground">
                {comment.createdAt}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {canEdit && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim()) return;
            const value = body;
            setBody("");
            startTransition(() => addComment(task.id, value));
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment… use @name to mention"
            rows={2}
            className="min-h-0"
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 self-end"
            disabled={pending}
            aria-label="Post comment"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
