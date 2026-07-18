import { requireUser } from "@/lib/auth";
import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { WORKSPACES, ALL_WORKSPACES } from "@/config/workspaces";
import { ClientDialog } from "./client-dialog";
import { deleteClientRecord } from "./actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { WorkspaceBadge } from "@/components/workspace-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

/** Clients — CRUD list scoped to the active workspace. */
export default async function ClientsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspace(user);

  // Client model uses `workspace`; adapt the shared filter fragment.
  const filter =
    workspace === ALL_WORKSPACES ? {} : { workspace };

  const clients = await prisma.client.findMany({
    where: { deletedAt: null, ...filter },
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: { where: { deletedAt: null } } } } },
  });

  const canEdit = user.role !== "VIEWER";
  const showWorkspaceColumn = workspace === ALL_WORKSPACES;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {workspace === ALL_WORKSPACES
              ? "All workspaces"
              : WORKSPACES[workspace].name}
          </p>
        </div>
        {canEdit && (
          <ClientDialog
            defaultWorkspace={workspace === ALL_WORKSPACES ? undefined : workspace}
          />
        )}
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed py-20 text-center">
          <Users className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No clients yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first client to start creating projects for them.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Company</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                {showWorkspaceColumn && <TableHead>Workspace</TableHead>}
                <TableHead className="text-right">Projects</TableHead>
                {canEdit && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {client.company || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {client.email || client.phone || "—"}
                  </TableCell>
                  {showWorkspaceColumn && (
                    <TableCell>
                      <WorkspaceBadge workspace={client.workspace} />
                    </TableCell>
                  )}
                  <TableCell className="text-right tabular-nums">
                    {client._count.projects}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <ClientDialog client={client} />
                        {user.role === "ADMIN" && (
                          <ConfirmDelete
                            title={`Delete ${client.name}?`}
                            description="The client moves to Trash and can be restored within 30 days. Their projects are not deleted."
                            onConfirm={deleteClientRecord.bind(null, client.id)}
                          />
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
