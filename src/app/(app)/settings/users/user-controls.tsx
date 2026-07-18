"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { UserPlus } from "lucide-react";
import { addUser, changeUserRole, toggleUserActive, type UserFormState } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";

const ROLES: Role[] = ["ADMIN", "MEMBER", "VIEWER"];

/** "Add user" dialog (Admin). */
export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    addUser,
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
          <UserPlus className="h-4 w-4" /> Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Also invite this email from the Supabase dashboard (Authentication
            → Users) so they can sign in.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select name="role" defaultValue="MEMBER" required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state?.error && (
            <p className="text-sm font-medium text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add user"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Inline role select for a user row. Disabled for your own account. */
export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: Role;
  disabled?: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <Select
      defaultValue={role}
      disabled={disabled}
      onValueChange={(value) =>
        startTransition(() => changeUserRole(userId, value))
      }
    >
      <SelectTrigger className="h-8 w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Active/deactivated switch for a user row. */
export function ActiveSwitch({
  userId,
  isActive,
  disabled,
}: {
  userId: string;
  isActive: boolean;
  disabled?: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <Switch
      defaultChecked={isActive}
      disabled={disabled}
      onCheckedChange={() => startTransition(() => toggleUserActive(userId))}
    />
  );
}
