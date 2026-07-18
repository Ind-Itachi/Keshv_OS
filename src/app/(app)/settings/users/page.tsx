import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { AddUserDialog, RoleSelect, ActiveSwitch } from "./user-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

/** Settings → Users: invite, change role, deactivate (Admin only, SPEC §2.11). */
export default async function UsersSettingsPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage who can access KESHV OS and what they can do.
          </p>
        </div>
        <AddUserDialog />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Joined</TableHead>
              <TableHead className="text-right">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === admin.id;
              return (
                <TableRow key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="font-medium">
                      {user.name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleSelect userId={user.id} role={user.role} disabled={isSelf} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActiveSwitch
                      userId={user.id}
                      isActive={user.isActive}
                      disabled={isSelf}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: sign-in accounts live in Supabase Auth. When adding a user here,
        also invite the same email from the Supabase dashboard.
      </p>
    </div>
  );
}
