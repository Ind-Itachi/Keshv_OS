"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { quickAddTask } from "@/app/(app)/tasks/actions";
import { Input } from "@/components/ui/input";

/** Type + Enter quick-add for a kanban column or list group (SPEC §2.2 style). */
export function QuickAdd({
  projectId,
  status,
}: {
  projectId: string | null;
  status: TaskStatus;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = title.trim();
        if (!value) {
          setEditing(false);
          return;
        }
        setTitle("");
        startTransition(() => quickAddTask({ title: value, projectId, status }));
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title.trim() && setEditing(false)}
        placeholder="Task title, then Enter"
        className="h-8 bg-card text-sm"
      />
    </form>
  );
}
