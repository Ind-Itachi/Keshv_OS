import { redirect } from "next/navigation";

/** Settings hub — Phase 1 ships user management; more arrives in Phase 6. */
export default function SettingsPage() {
  redirect("/settings/users");
}
