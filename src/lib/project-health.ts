import { daysUntil } from "@/lib/format";

export type ProjectHealth = "green" | "amber" | "red";

type HealthInput = {
  deadline: Date | null;
  /** 0–100, auto-calculated from tasks complete. */
  progress: number;
  /** Any task past its due date and not done. */
  hasOverdueTask: boolean;
  stage: string;
};

/**
 * Health dot (SPEC §2.1): red if any overdue task, or deadline < 3 days
 * away with < 80% complete. Amber when the deadline is within 7 days and
 * work isn't done. Delivered/closed projects are always green.
 */
export function projectHealth(input: HealthInput): ProjectHealth {
  if (["DELIVERED", "CLOSED"].includes(input.stage)) return "green";
  if (input.hasOverdueTask) return "red";

  if (input.deadline) {
    const days = daysUntil(input.deadline);
    if (days < 3 && input.progress < 80) return "red";
    if (days < 7 && input.progress < 100) return "amber";
  }
  return "green";
}

/** % complete from task counts (SPEC §2.3: auto-calculated). */
export function progressFromTasks(total: number, done: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}
