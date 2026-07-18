# SPEC — KESHV OS: Work & Task Management System

**Product:** Internal operations app for Keshv Design Studio + SLATE
**Inspiration benchmark:** ClickUp (customization + views), Asana (process clarity), Teamwork (client-service workflows), ProofHub (design proofing), Monday.com (request forms/automation), Linear (speed + keyboard-first UX)
**Goal:** One-stop system to control every task and project from first enquiry to final delivery, with admin-only final authority.

---

## 0. Workspace System (FIRST screen after login)

- After login, show the **Workspace Picker**: two large branded cards —
  **Keshv Design Studio** and **SLATE** (theme/logo per `config/workspaces.ts`,
  see README). Admins see a third smaller option: **All Workspaces**.
- Selecting a workspace: filters ALL data (projects, tasks, clients, files,
  reports) to that workspace and re-themes the entire UI (sidebar logo, primary
  colors, app title) to that company.
- Workspace switcher chip always visible in the top bar; choice persisted.
- "All Workspaces" (Admin only): combined dashboard and All Work views, every
  item shows a workspace badge chip; creation actions ask which workspace.
- Every model below includes `workspaceId (KESHV | SLATE)`; service-type lists
  are defined per workspace (Keshv's four pillars vs SLATE's own service list).
- "My Day" to-dos are personal and cross-workspace (shown in both), but a todo
  linked to a project inherits that project's workspace badge.

## 1. Users & Roles

| Role | Who | Rights |
|------|-----|--------|
| **Admin** | Ravi + Partner (2 founders) | Everything: create/delete anything, approve, assign, change status to "Delivered/Closed", manage users, see all reports, edit settings |
| **Member** | Future team members / freelancers | See only assigned projects & tasks, update task status (except final approval states), log time, comment, upload files |
| **Viewer** | Optional (e.g., accountant) | Read-only on permitted projects |

Rules:
- Only Admins can: delete anything, mark a project Delivered/Closed, approve deliverables, change deadlines, manage users, see financial fields.
- Every destructive action (delete project/task) requires a confirm dialog + is soft-deleted (recoverable for 30 days from a Trash page, Admin only).
- Full audit log: every create/update/delete/status-change recorded with user + timestamp.

## 2. Core Modules

### 2.1 Dashboard (home)
- "Today" panel: my tasks due today, overdue (red), upcoming 3 days.
- Priority strip: tasks flagged Urgent across all projects.
- Active projects grid: card per project → name, client, entity badge (Keshv / SLATE), stage, % complete, deadline countdown, health dot (green/amber/red — red if any overdue task or deadline < 3 days with < 80% complete).
- This-week workload split between the two partners (bar per person).
- Recent activity feed (last 20 events).

### 2.2 Daily To-Do
- Personal daily list per user, separate from project tasks but can link a project task into today.
- Quick-add input at top (type + Enter).
- Sections: Today / Tomorrow / This Week / Someday.
- Drag to reorder; unfinished Today items auto-roll to next day (marked "rolled over ×N").
- Daily focus: pin max 3 tasks as "Top 3 today" shown on Dashboard.

### 2.3 Projects (full lifecycle)
Pipeline stages (fixed, in order):
`Enquiry → Proposal Sent → Won → Planning → In Production → Internal Review → Client Review → Revisions → Final Approval → Delivered → Closed`
(plus `Lost` and `On Hold` as side states)

Project fields:
- Name, Client (link to client record), Entity (Keshv Design Studio | SLATE), Service type (Strategic Brand & Identity | Digital Experience | Visual Storytelling & Campaigns | Communication & Product Design | Other), Description
- Start date, Deadline, Delivered date
- Budget amount (₹, Admin-visible only), Advance received toggle
- Assigned partners/members, Priority (Low/Medium/High/Urgent)
- Progress % (auto-calculated from tasks complete)
- Retainer flag: if retainer → monthly hours bank + hours consumed this month
- Project cover color + optional client logo

Project detail page tabs: **Overview | Tasks | Files | Timeline | Activity | Notes**

### 2.4 Tasks
- Belong to a project (or standalone "Studio task").
- Fields: title, description (rich text), assignee, status (Backlog / To Do / In Progress / In Review / Done), priority, due date, estimated hours, actual hours, labels, checklist (subtasks), attachments, comments thread.
- Dependencies: "blocked by" link; blocked tasks show a lock icon and can't be started.
- Recurring tasks (daily/weekly/monthly) for studio ops (e.g., "Post on Instagram", "Send invoices").

### 2.5 Views (per project and global "All Work")
1. **List** (grouped by status or assignee, sortable)
2. **Kanban board** (drag between status columns)
3. **Calendar** (tasks + project deadlines by month/week)
4. **Timeline/Gantt** (projects as bars, simple horizontal scroll, deadline markers)

### 2.6 Time Tracking
- Start/stop timer on any task (one running timer per user, shown in header).
- Manual time entry (date, hours, task, note).
- Per-project time report: estimated vs actual, per person.
- Retainer projects: consumed hours vs monthly bank, warning at 80%.

### 2.7 Files & Versions
- Upload to project (Supabase Storage), grid + list view.
- Version stacking: uploading same filename creates v2, v3… with history.
- Mark one file per deliverable as "Final" (Admin only).

### 2.8 Approvals (internal proofing)
- Any file can be sent "For Review" to an Admin.
- Reviewer can Approve or Request Changes with a comment.
- Approval state shows on the file badge. (Client-side approvals live in App 3 — Keshv Bridge.)

### 2.9 Notifications
- In-app bell: assigned to task, comment mention (@name), status change on my task, deadline in 24h, overdue, approval requested/decided.
- Daily 9:00 AM digest section on dashboard ("What needs attention today").

### 2.10 Reports (Admin only)
- Projects delivered per month (bar chart)
- On-time vs late delivery rate
- Workload per person (open tasks + hours logged)
- Average project duration by service type
- Pipeline funnel: enquiries → won conversion

### 2.11 Settings (Admin only)
- User management (invite, role, deactivate)
- Labels, service types, entities
- Trash / restore
- Export all data (JSON + CSV)

## 3. Data Model (Prisma outline)

```
User(id, name, email, role[ADMIN|MEMBER|VIEWER], avatarUrl, isActive)
Client(id, name, company, email, phone, entity)
Project(id, name, clientId, workspaceId[KESHV|SLATE], serviceType, stage, priority, description,
        startDate, deadline, deliveredAt, budget, isRetainer, retainerHours,
        coverColor, createdById, deletedAt)
ProjectMember(projectId, userId)
Task(id, projectId?, title, description, status, priority, assigneeId,
     dueDate, estimateHrs, labels[], order, recurringRule?, deletedAt)
Subtask(id, taskId, title, done)
TaskDependency(taskId, blockedById)
Comment(id, taskId|projectId, authorId, body, mentions[])
TimeEntry(id, taskId, userId, startedAt, endedAt, hours, note)
File(id, projectId, name, version, url, size, uploadedById, isFinal,
     approvalStatus[NONE|PENDING|APPROVED|CHANGES], approvalComment)
TodoItem(id, userId, title, bucket[TODAY|TOMORROW|WEEK|SOMEDAY], linkedTaskId?,
         isTop3, rolledOverCount, done, date)
Notification(id, userId, type, payload, readAt)
ActivityLog(id, actorId, action, entityType, entityId, meta, createdAt)
```

## 4. UX Requirements

- Follow the Keshv Brand System (see README): Canvas White base, Graphite text, Crimson primary buttons, Cobalt headers, Copper for warnings/badges.
- Left sidebar nav: Dashboard, My Day, Projects, All Work, Calendar, Reports, Settings. Collapsible.
- Global quick-add button (+) → new task / project from anywhere.
- Global search (Cmd/Ctrl+K): projects, tasks, clients, files.
- Fully responsive — must work well on mobile (partners check on phone).
- Empty states with helpful copy, skeleton loaders, optimistic UI on drag/drop.

## 5. Build Phases (Claude Code must follow this order)

**Phase 1 — Foundation:** Auth (login, roles), **Workspace Picker screen + per-workspace theming + workspace switcher**, layout/sidebar, User + Client + Project CRUD, project pipeline stages, project list + detail Overview tab.
**Phase 2 — Tasks:** Task CRUD, List + Kanban views, subtasks, comments, labels, priorities, drag-and-drop.
**Phase 3 — My Day:** Daily to-do module, Top 3, rollover logic, Dashboard home.
**Phase 4 — Time & Files:** Timer, time entries, file upload + versions, internal approvals.
**Phase 5 — Views & Notifications:** Calendar, Timeline/Gantt, notification system, global search.
**Phase 6 — Reports & Polish:** Admin reports with Recharts, activity log page, trash/restore, settings, data export, mobile polish.

## 6. Non-Goals (v1)
- No client login here (that's Keshv Bridge / App 3).
- No invoicing here (that's Keshv Ledger / App 2).
- No real-time multiplayer cursors; simple refresh/poll is fine.
