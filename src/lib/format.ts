import { formatInTimeZone } from "date-fns-tz";

/** Studio timezone — all dates render in IST regardless of server locale. */
export const TIMEZONE = "Asia/Kolkata";

/** Format money as INR with Indian digit grouping: ₹1,50,000 */
export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** "18 Jul 2026" in IST */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatInTimeZone(new Date(date), TIMEZONE, "d MMM yyyy");
}

/** "18 Jul 2026, 9:30 AM" in IST */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatInTimeZone(new Date(date), TIMEZONE, "d MMM yyyy, h:mm a");
}

/** yyyy-MM-dd (for <input type="date"> values) in IST */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  return formatInTimeZone(new Date(date), TIMEZONE, "yyyy-MM-dd");
}

/**
 * Whole days from now until `date` (IST midnight boundaries).
 * Negative = overdue.
 */
export function daysUntil(date: Date | string): number {
  const target = formatInTimeZone(new Date(date), TIMEZONE, "yyyy-MM-dd");
  const today = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
  const msPerDay = 86_400_000;
  return Math.round(
    (Date.parse(target) - Date.parse(today)) / msPerDay
  );
}

/** Human deadline countdown: "in 5 days" / "today" / "3 days overdue" */
export function deadlineCountdown(date: Date | string | null | undefined): string {
  if (!date) return "No deadline";
  const days = daysUntil(date);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${-days} days overdue`;
}
