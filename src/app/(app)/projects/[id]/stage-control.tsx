"use client";

import { useTransition } from "react";
import type { ProjectStage } from "@prisma/client";
import { Check } from "lucide-react";
import {
  ADMIN_ONLY_STAGES,
  PIPELINE_STAGES,
  SIDE_STAGES,
  STAGE_LABELS,
  stageIndex,
} from "@/lib/stages";
import { cn } from "@/lib/utils";
import { changeStage } from "../actions";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Pipeline stepper + stage switcher (SPEC §2.3).
 * Delivered/Closed are Admin-only (SPEC §1); Viewers are read-only.
 */
export function StageControl({
  projectId,
  stage,
  isAdmin,
  readOnly,
}: {
  projectId: string;
  stage: ProjectStage;
  isAdmin: boolean;
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const currentIdx = stageIndex(stage);

  return (
    <div className="space-y-3">
      {/* Horizontal stepper — scrolls on small screens */}
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-max items-center gap-1">
          {PIPELINE_STAGES.map((s, i) => {
            const reached = currentIdx >= 0 && i <= currentIdx;
            const isCurrent = s === stage;
            return (
              <li key={s} className="flex items-center gap-1">
                {i > 0 && (
                  <span
                    className={cn(
                      "h-px w-4",
                      reached ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
                <span
                  className={cn(
                    "flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : reached
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {reached && !isCurrent && <Check className="h-3 w-3" />}
                  {STAGE_LABELS[s]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {!readOnly && (
        <Select
          value={stage}
          disabled={pending}
          onValueChange={(value) =>
            startTransition(() => changeStage(projectId, value as ProjectStage))
          }
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Pipeline</SelectLabel>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  disabled={ADMIN_ONLY_STAGES.includes(s) && !isAdmin}
                >
                  {STAGE_LABELS[s]}
                  {ADMIN_ONLY_STAGES.includes(s) && !isAdmin && " (admin)"}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Side states</SelectLabel>
              {SIDE_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
