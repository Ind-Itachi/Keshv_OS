import type { ProjectHealth } from "@/lib/project-health";
import { cn } from "@/lib/utils";

const COLORS: Record<ProjectHealth, string> = {
  green: "bg-health-green",
  amber: "bg-health-amber",
  red: "bg-health-red",
};

/** Project health indicator (SPEC §2.1). */
export function HealthDot({ health }: { health: ProjectHealth }) {
  return (
    <span
      title={`Health: ${health}`}
      className={cn("inline-block h-2.5 w-2.5 rounded-full", COLORS[health])}
    />
  );
}
