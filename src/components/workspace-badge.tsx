import type { Workspace } from "@prisma/client";
import { WORKSPACES } from "@/config/workspaces";

/**
 * Small workspace chip shown on items in "All Workspaces" mode (SPEC §0).
 */
export function WorkspaceBadge({ workspace }: { workspace: Workspace }) {
  const config = WORKSPACES[workspace];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ color: config.primary, borderColor: `${config.primary}40` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.primary }}
      />
      {config.shortName}
    </span>
  );
}
