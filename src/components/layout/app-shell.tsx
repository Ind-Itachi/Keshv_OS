"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Sun,
  FolderKanban,
  Layers,
  Calendar,
  BarChart3,
  Settings,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ChevronDown,
  Building2,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { WORKSPACES, ALL_WORKSPACES, type WorkspaceSelection } from "@/config/workspaces";
import { selectWorkspace } from "@/app/select-workspace/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type ShellUser = { id: string; name: string; email: string; role: Role };

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-day", label: "My Day", icon: Sun },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/all-work", label: "All Work", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

/** Sidebar + topbar shell (SPEC §4). Sidebar collapses; mobile uses a sheet. */
export function AppShell({
  user,
  workspace,
  children,
}: {
  user: ShellUser;
  workspace: WorkspaceSelection;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const wsConfig = workspace === ALL_WORKSPACES ? null : WORKSPACES[workspace];
  const wsName = wsConfig?.name ?? "All Workspaces";
  const navItems = NAV_ITEMS.filter((i) => !i.adminOnly || user.role === "ADMIN");

  const sidebarInner = (
    <>
      {/* Workspace logo / app title */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: wsConfig?.primary ?? "var(--graphite)" }}
        >
          {wsConfig?.initials ?? <Building2 className="h-4 w-4" />}
        </span>
        {!collapsed && (
          <span className="truncate text-sm font-semibold">{wsName}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden border-t border-sidebar-border p-2 md:block">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              Collapse
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {sidebarInner}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur">
          {/* Mobile nav */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-64 flex-col gap-0 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebarInner}
            </SheetContent>
          </Sheet>

          <WorkspaceSwitcher current={workspace} isAdmin={user.role === "ADMIN"} />

          <div className="ml-auto flex items-center gap-2">
            <UserMenu user={user} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
    </Link>
  );
}

/** Always-visible workspace chip in the top bar (SPEC §0). */
function WorkspaceSwitcher({
  current,
  isAdmin,
}: {
  current: WorkspaceSelection;
  isAdmin: boolean;
}) {
  const config = current === ALL_WORKSPACES ? null : WORKSPACES[current];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: config?.primary ?? "var(--graphite)" }}
          />
          {config?.shortName ?? "All Workspaces"}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        {Object.values(WORKSPACES).map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => selectWorkspace(ws.id)}
            className="gap-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: ws.primary }}
            />
            {ws.name}
          </DropdownMenuItem>
        ))}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => selectWorkspace(ALL_WORKSPACES)}
              className="gap-2"
            >
              <Building2 className="h-3.5 w-3.5" />
              All Workspaces
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-graphite text-xs font-semibold text-white" style={{ backgroundColor: "var(--graphite)" }}>
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="text-sm">{user.name}</div>
          <div className="text-xs font-normal text-muted-foreground">
            {user.email} · {user.role.toLowerCase()}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
