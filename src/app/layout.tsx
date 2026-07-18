import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import { isWorkspace } from "@/config/workspaces";
import "./globals.css";

export const metadata: Metadata = {
  title: "KESHV OS",
  description: "Work & task management for Keshv Design Studio + SLATE",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Theme the whole document from the persisted workspace choice.
  // "ALL" (and no choice) fall back to the default Keshv theme.
  const raw = (await cookies()).get(WORKSPACE_COOKIE)?.value ?? "";
  const workspace = isWorkspace(raw) ? raw : "KESHV";

  return (
    <html lang="en" data-workspace={workspace}>
      <body className="font-sans">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
