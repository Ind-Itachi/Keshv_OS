"use client";

import { useActionState, useEffect, useState } from "react";
import type { Client, Workspace } from "@prisma/client";
import { Plus, Pencil } from "lucide-react";
import { WORKSPACES } from "@/config/workspaces";
import {
  createClientRecord,
  updateClientRecord,
  type ClientFormState,
} from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Create/edit client dialog. `defaultWorkspace` pre-selects the active
 * workspace; in "All Workspaces" mode the user must pick one (SPEC §0).
 */
export function ClientDialog({
  client,
  defaultWorkspace,
}: {
  client?: Client;
  defaultWorkspace?: Workspace;
}) {
  const [open, setOpen] = useState(false);
  const action = client
    ? updateClientRecord.bind(null, client.id)
    : createClientRecord;
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(
    action,
    undefined
  );

  // Close the dialog after a successful submit (action returns undefined).
  useEffect(() => {
    if (!pending && state === undefined) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {client ? (
          <Button variant="ghost" size="icon" aria-label="Edit client">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> New client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required defaultValue={client?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              defaultValue={client?.company ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={client?.email ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={client?.phone ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Workspace *</Label>
            <Select
              name="workspace"
              defaultValue={client?.workspace ?? defaultWorkspace}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose workspace" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(WORKSPACES).map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state?.error && (
            <p className="text-sm font-medium text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : client ? "Save changes" : "Create client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
