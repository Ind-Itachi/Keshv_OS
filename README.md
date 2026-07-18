# KESHV OS — Work & Task Management

Internal operations app for **Keshv Design Studio** + **SLATE**. One system to
control every task and project from first enquiry to final delivery, with
admin-only final authority. Built per `SPEC.md`.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Prisma · Supabase (Postgres + Auth + Storage)

---

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env.local` and fill in
   your Supabase project URL, anon key, service-role key, and the two Postgres
   connection strings (pooled `DATABASE_URL` + direct `DIRECT_URL`).

3. **Create the database schema**

   ```bash
   npm run db:push        # pushes prisma/schema.prisma to Supabase Postgres
   ```

4. **Create your login** — in the Supabase dashboard, go to
   *Authentication → Users → Add user* and create an email/password account.
   The **first person to sign in becomes Admin automatically**; everyone after
   that must first be added by an Admin in *Settings → Users* (plus a matching
   Supabase Auth account).

5. **Run it**

   ```bash
   npm run dev
   ```

## How access works

| Role | Rights |
|------|--------|
| **Admin** | Everything: delete, approve, assign, Delivered/Closed stages, deadlines, financial fields, user management |
| **Member** | Only assigned projects & tasks; can update statuses (not final approval states), log time, comment, upload |
| **Viewer** | Read-only on permitted projects |

- Deletes are **soft** (30-day Trash, Admin-only page arrives Phase 6) and
  always confirm first.
- Every create/update/delete/stage-change is written to the audit log
  (`ActivityLog`).

## Workspaces

After login you pick a workspace — **Keshv Design Studio** or **SLATE**
(Admins also get **All Workspaces**). The choice persists in a cookie, filters
all data, and re-themes the whole UI. Per-workspace branding, taglines and
service-type lists live in `src/config/workspaces.ts`; the theme switch itself
is a `data-workspace` attribute on `<html>` that remaps CSS variables in
`src/app/globals.css`.

## Brand system

| Token | Value | Use |
|-------|-------|-----|
| Canvas White | `#faf9f6` | App background |
| Graphite | `#26282b` | Body text |
| Crimson | `#c41e3a` | Primary buttons, Keshv accent |
| Cobalt | `#1849a9` | Headers (`h1`/`h2`), SLATE accent |
| Copper | `#b87333` | Warnings, badges (e.g. Admin, Retainer) |

Health dots: green `#22a06b` · amber `#d97708` · red `#d92d20`.
All tokens are defined once in `globals.css` and exposed to Tailwind as
`bg-crimson`, `text-cobalt`, `bg-warning-soft`, `text-health-red`, etc.

**Money** is INR formatted with `en-IN` grouping (₹1,50,000) via
`src/lib/format.ts`; **all dates render in Asia/Kolkata**.

## Build phases

- [x] **Phase 1 — Foundation:** auth + roles, workspace picker / theming /
      switcher, layout + collapsible sidebar, User + Client + Project CRUD,
      pipeline stages, project list + detail Overview tab
- [ ] **Phase 2 — Tasks:** task CRUD, List + Kanban, subtasks, comments, drag-and-drop
- [ ] **Phase 3 — My Day:** daily to-dos, Top 3, rollover, Dashboard home
- [ ] **Phase 4 — Time & Files:** timer, time entries, uploads + versions, approvals
- [ ] **Phase 5 — Views & Notifications:** calendar, timeline/Gantt, notifications, ⌘K search
- [ ] **Phase 6 — Reports & Polish:** admin reports, activity log, trash/restore, export

## Project structure

```
prisma/schema.prisma        Full data model (SPEC §3) — later phases add no restructuring
src/config/workspaces.ts    Per-workspace branding + service types
src/lib/                    prisma, supabase clients, auth, workspace cookie,
                            INR/IST formatting, pipeline stages, audit log
src/app/login               Supabase email/password sign-in
src/app/select-workspace    Workspace picker (first screen after login)
src/app/(app)/              Authenticated shell: sidebar + topbar + pages
```
