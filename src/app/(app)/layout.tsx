import { requireUser } from "@/lib/auth";
import { requireWorkspace } from "@/lib/workspace";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Authenticated app shell: sidebar + topbar around every in-app page.
 * Requires a signed-in user AND a chosen workspace (else → picker).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const workspace = await requireWorkspace(user);

  return (
    <AppShell
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      workspace={workspace}
    >
      {children}
    </AppShell>
  );
}
