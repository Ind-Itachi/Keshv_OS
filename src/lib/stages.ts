import type { Priority, ProjectStage } from "@prisma/client";

/** Fixed pipeline order (SPEC §2.3). LOST / ON_HOLD are side states. */
export const PIPELINE_STAGES: ProjectStage[] = [
  "ENQUIRY",
  "PROPOSAL_SENT",
  "WON",
  "PLANNING",
  "IN_PRODUCTION",
  "INTERNAL_REVIEW",
  "CLIENT_REVIEW",
  "REVISIONS",
  "FINAL_APPROVAL",
  "DELIVERED",
  "CLOSED",
];

export const SIDE_STAGES: ProjectStage[] = ["LOST", "ON_HOLD"];

export const STAGE_LABELS: Record<ProjectStage, string> = {
  ENQUIRY: "Enquiry",
  PROPOSAL_SENT: "Proposal Sent",
  WON: "Won",
  PLANNING: "Planning",
  IN_PRODUCTION: "In Production",
  INTERNAL_REVIEW: "Internal Review",
  CLIENT_REVIEW: "Client Review",
  REVISIONS: "Revisions",
  FINAL_APPROVAL: "Final Approval",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
  LOST: "Lost",
  ON_HOLD: "On Hold",
};

/** Stages only an ADMIN may set (SPEC §1: final authority). */
export const ADMIN_ONLY_STAGES: ProjectStage[] = ["DELIVERED", "CLOSED"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

/** Badge styling per priority (Copper for warning-level per brand system). */
export const PRIORITY_CLASSES: Record<Priority, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-cobalt/10 text-cobalt",
  HIGH: "bg-warning-soft text-copper",
  URGENT: "bg-crimson/10 text-crimson",
};

/** 0-based position in the linear pipeline; side states return -1. */
export function stageIndex(stage: ProjectStage): number {
  return PIPELINE_STAGES.indexOf(stage);
}
