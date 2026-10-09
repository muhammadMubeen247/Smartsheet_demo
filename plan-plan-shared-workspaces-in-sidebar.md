# Plan: Shared Workspaces in Sidebar

## Current State Analysis

- **Sidebar** (`Sidebar.jsx`) only shows top-level nav links (Home, Workspaces). It does NOT list workspaces — workspace listing is on the `Workspaces.jsx` page in its own left panel.
- **Workspaces page** (`Workspaces.jsx`) has a left sidebar with a single heading **"Your workspaces"** that lists `GET /workspaces` (owned workspaces via `listByOwner`).
- **Backend**: Workspaces are strictly owner-only via `assertWorkspaceOwnership`. There is no `WorkspaceShare` model in the schema — only `SheetShare` exists.
- **Sheet sharing** already works (Sprint 3) but is sheet-level, not workspace-level.

---

## Phase 1: Backend — Workspace Sharing Infrastructure

### 1a. Schema Update: `prisma/schema.prisma`

Add `WorkspaceShare` model and relation:

```prisma
model Workspace {
  ...
  shares       WorkspaceShare[]
  ...
}

model User {
  ...
  workspaceShares WorkspaceShare[]
  ...
}

model WorkspaceShare {
  id         Int              @id @default(autoincrement())
  workspaceId Int
  workspace  Workspace        @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId     Int
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission WorkspacePermission
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  @@unique([workspaceId, userId])
  @@index([userId])
  @@map("workspace_shares")
}

enum WorkspacePermission {
  EDITOR
  COMMENTER
  VIEWER
}
```

**Migration**: Generate and apply with `npx prisma migrate dev --name add_workspace_sharing`.

**Verification**:
- `npx prisma migrate dev --name add_workspace_sharing` runs without error
- `npx prisma studio` shows the new `workspace_shares` table with correct columns
- `npx prisma generate` succeeds

---

### 1b. New Module: `backend/src/modules/workspace-sharing/`

Create a new module following the existing pattern (controller + service + routes):

**`workspaces-shared.service.js`**:
```js
async function listSharedWithMe(userId) {
  const shares = await prisma.workspaceShare.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { sheets: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return shares.map(share => ({
    id: share.workspace.id,
    name: share.workspace.name,
    ownerId: share.workspace.ownerId,
    ownerName: share.workspace.owner.name,
    ownerEmail: share.workspace.owner.email,
    permission: share.permission,
    sheetCount: share.workspace._count.sheets,
    sharedAt: share.createdAt,
    shareId: share.id,
  }));
}

async function shareWorkspace({ workspaceId, email, permission }) {
  // Validate workspace exists
  // Validate target user exists (by email)
  // Prevent sharing with owner
  // Check no duplicate share
  // Create share
}
```

**`workspaces-shared.controller.js`**:
- `listSharedWithMe` — `GET /workspaces/shared-with-me`
- `create` — `POST /workspaces/:workspaceId/shares` (email + permission)
- `listByWorkspace` — `GET /workspaces/:workspaceId/shares`
- `updateShare` — `PATCH /workspaces/:workspaceId/shares/:shareId`
- `removeShare` — `DELETE /workspaces/:workspaceId/shares/:shareId`

**`workspaces-shared.routes.js`**:
- Mounts at `/workspaces` (must define `shared-with-me` BEFORE `/:workspaceId`)
- All routes protected with `auth` middleware
- Permission validation: `EDITOR | COMMENTER | VIEWER`

**Wire into `app.js`**: Insert before the main workspaces routes so `/workspaces/shared-with-me` doesn't match as `/:workspaceId`.

**Verification**:
- `node -e "require('./src/app.js')"` — loads without error
- Manual curl test: `POST /workspaces/:id/shares` with valid payload returns 201
- Error cases: 404 (nonexistent workspace/user), 409 (duplicate), 400 (invalid permission/owner share)

---

### 1c. Update Ownership Service

Modify `assertWorkspaceOwnership` to also allow shared access:

```js
async function assertWorkspaceAccess(workspaceId, userId) {
  const workspace = await prisma.workspace.findUnique({ where: { id: parseInt(workspaceId, 10) } });
  if (!workspace) throw new NotFoundError('Workspace not found');
  
  // Owner always has access
  if (workspace.ownerId === userId) return workspace;
  
  // Check for workspace share
  const share = await prisma.workspaceShare.findUnique({
    where: { workspaceId_userId: { workspaceId: parseInt(workspaceId, 10), userId } }
  });
  if (!share) throw new ForbiddenError('You do not have access to this workspace');
  
  return { ...workspace, permission: share.permission };
}
```

Replace `assertWorkspaceOwnership` calls in `workspaces.controller.js` with `assertWorkspaceAccess`. Keep `assertWorkspaceOwnership` for destructive operations (update/delete) — only owners should modify workspaces.

**Verification**:
- Shared user can `GET /workspaces/:id` successfully
- Shared user gets 403 on `PUT /workspaces/:id` and `DELETE /workspaces/:id`
- Owner retains full access

---

## Phase 2: Frontend — Sidebar Integration

### 2a. Modify `Sidebar.jsx`

Add workspace listing to the sidebar with two sections:

**State & Data Fetching**:
- `useEffect` on mount to fetch `GET /workspaces` (owned) and `GET /workspaces/shared-with-me` (shared)
- Store in `useState`: `ownedWorkspaces` and `sharedWorkspaces`

**Rendering** (collapsed and expanded modes):

```
YOUR WORKSPACES
  > Project Alpha    ← owned, owned by user

SHARED WITH ME
  > Marketing Data   ← shared, badge showing permission (Editor/Viewer)
  > Analytics        ← shared, badge
```

**Visual Design**:
- Shared workspaces get a subtle permission badge (e.g., small `Editor` text in `zinc-500`)
- Hover and active states match existing pattern
- Expandable items showing sheets underneath (same as owned workspaces)
- Collapsed mode: hide labels, show only icons + red dot indicator for shared

**Key Implementation Details**:
- Use existing `BriefcaseBusiness` icon for owned, add a `Share2` or `Globe` icon for shared
- Clicking a workspace navigates to `/workspaces/:workspaceId`
- Expanding fetches workspace details (existing `loadWorkspaceDetails` pattern)
- Empty state: show a small "No shared workspaces" text or skip rendering the section entirely

**Verification**:
- Build succeeds: `npm run build`
- Sidebar renders both sections when data exists
- Sidebar renders only "Your workspaces" when no shared workspaces
- Clicking a shared workspace navigates correctly
- Collapsed mode hides text labels properly

---

### 2b. Modify `Workspaces.jsx`

Add a "Shared workspaces" section in the left panel (mirroring the "Your workspaces" section):

**Data Fetching**:
- Fetch `GET /workspaces/shared-with-me` alongside the existing `GET /workspaces`
- Store in `sharedWorkspaces` state

**Rendering** (in the left sidebar panel):

```
YOUR WORKSPACES
  > Project Alpha    [expand/collapse]
    - Sheet 1
    - Sheet 2

SHARED WITH ME
  > Marketing Data   [Editor badge] [expand/collapse]
    - Campaign Plan
  > Analytics        [Viewer badge] [expand/collapse]
    - Monthly Report
```

**Visual Distinction**:
- Section header: `SHARED WITH ME` (same style as `YOUR WORKSPACES` uppercase tracking header)
- Each shared workspace item shows: workspace name + small permission badge (pill style: `bg-zinc-100 text-zinc-600 text-[10px]`)
- Expand/collapse and sheet listing work identically to owned workspaces
- Clicking a shared workspace navigates to the same `/workspaces/:id` route

**Workspace Detail View** (right panel):
- When a shared workspace is selected, show sheets same as owned
- Hide "New sheet" button for non-EDITOR shared users
- Show a banner: "Shared with you as [Permission]"

**Verification**:
- Build succeeds
- Shared workspaces section renders correctly
- Permission badges display correctly
- Non-EDITOR users cannot see "New sheet" button
- Empty state handled gracefully

---

## Phase 3: Workspace Sharing UI (Optional Future Step)

A share button on the workspace detail page to allow owners to share workspaces. This is NOT part of the initial plan — the user only asked for displaying shared workspaces. This can be added later if needed.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | Add `WorkspaceShare` model and `WorkspacePermission` enum |
| `backend/src/modules/workspace-sharing/workspaces-shared.service.js` | Create | `listSharedWithMe`, `shareWorkspace` |
| `backend/src/modules/workspace-sharing/workspaces-shared.controller.js` | Create | Controller with `listSharedWithMe` |
| `backend/src/modules/workspace-sharing/workspaces-shared.routes.js` | Create | Routes at `/workspaces` |
| `backend/src/app.js` | Modify | Import and mount workspace-sharing routes |
| `backend/src/modules/auth/ownership.service.js` | Modify | Add `assertWorkspaceAccess` |
| `backend/src/modules/workspaces/workspaces.controller.js` | Modify | Use `assertWorkspaceAccess` for read ops |
| `frontend/src/components/layout/Sidebar.jsx` | Modify | Add owned + shared workspace sections with fetch |
| `frontend/src/pages/Workspaces.jsx` | Modify | Add "Shared with me" section in left panel |

## Migration & Setup Order

1. Update Prisma schema → run migration → verify tables
2. Create backend module files → wire into app.js → verify server starts
3. Update ownership service → test access control with curl
4. Update frontend Sidebar → build and verify
5. Update frontend Workspaces → build and verify

## Testing at Each Step

| Step | Test |
|------|------|
| Schema migration | `npx prisma migrate dev` succeeds, table exists in `npx prisma studio` |
| Backend module loads | `node -e "require('./src/app.js')"` returns `OK` |
| Backend sharing endpoint | `curl POST /workspaces/:id/shares` with auth token → 201 |
| Backend shared-with-me | `curl GET /workspaces/shared-with-me` → 200 with data |
| Ownership access control | Shared user GET works (200), PUT/DELETE returns 403 |
| Frontend build | `npm run build` with zero errors |
| Sidebar rendering | Both sections appear, shared workspaces have permission badges |
| Workspace navigation | Clicking shared workspace navigates and loads sheets |
| Empty states | Sections gracefully hide or show "No shared workspaces" |