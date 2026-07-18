import type { ProjectStage } from "@prisma/client";
import { STAGE_LABELS, stageIndex, PIPELINE_STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";

/** Pipeline stage chip. Early pipeline = cobalt, late = success, side states = copper/grey. */
export function StageBadge({ stage }: { stage: ProjectStage }) {
  const idx = stageIndex(stage);
  const cls =
    stage === "LOST"
      ? "bg-muted text-muted-foreground line-through"
      : stage === "ON_HOLD"
        ? "bg-warning-soft text-copper"
        : stage === "DELIVERED" || stage === "CLOSED"
          ? "bg-success/10 text-success"
          : idx >= PIPELINE_STAGES.indexOf("PLANNING")
            ? "bg-primary/10 text-primary"
            : "bg-cobalt/10 text-cobalt";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        cls
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
