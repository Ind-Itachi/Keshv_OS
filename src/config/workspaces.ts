import type { Workspace } from "@prisma/client";

/**
 * Per-workspace branding + configuration (SPEC §0).
 * Selecting a workspace filters all data and re-themes the UI using these
 * values. Colors are also used directly on the Workspace Picker cards,
 * where both brands must render side-by-side regardless of active theme.
 */
export type WorkspaceConfig = {
  id: Workspace;
  name: string;
  shortName: string;
  tagline: string;
  /** Initials shown in the logo mark (until real logo files are added). */
  initials: string;
  /** Primary brand color (buttons, active nav, badges). */
  primary: string;
  /** Darker shade for hovers / gradients. */
  primaryDeep: string;
  /** Service types offered by this workspace (SPEC §2.3). */
  serviceTypes: string[];
};

export const WORKSPACES: Record<Workspace, WorkspaceConfig> = {
  KESHV: {
    id: "KESHV",
    name: "Keshv Design Studio",
    shortName: "Keshv",
    tagline: "Design that moves brands",
    initials: "K",
    primary: "#c41e3a", // Crimson
    primaryDeep: "#a01830",
    serviceTypes: [
      "Strategic Brand & Identity",
      "Digital Experience",
      "Visual Storytelling & Campaigns",
      "Communication & Product Design",
      "Other",
    ],
  },
  SLATE: {
    id: "SLATE",
    name: "SLATE",
    shortName: "SLATE",
    tagline: "Built on solid ground",
    initials: "S",
    primary: "#1849a9", // Cobalt
    primaryDeep: "#123a88",
    // SLATE's own service list — adjust freely (Settings UI arrives Phase 6)
    serviceTypes: [
      "Content & Social",
      "Web & Digital",
      "Brand & Collateral",
      "Consulting",
      "Other",
    ],
  },
};

export const WORKSPACE_IDS = ["KESHV", "SLATE"] as const satisfies readonly Workspace[];

/** Admin-only pseudo-workspace: combined view across both companies. */
export const ALL_WORKSPACES = "ALL" as const;

export type WorkspaceSelection = Workspace | typeof ALL_WORKSPACES;

export function isWorkspace(value: string): value is Workspace {
  return (WORKSPACE_IDS as readonly string[]).includes(value);
}
