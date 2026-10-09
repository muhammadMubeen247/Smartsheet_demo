# Plan: Sheet Sharing & Comment Functionality

## Overview

Add sheet sharing (with permission levels) and comments (sheet-level, row-level, threaded replies) to the existing backend. Implementation follows the project's established conventions: module-based MVC (`routes.js` → `controller.js` → `service.js`), `express-validator` for validation, custom error classes, JWT auth, and `{ data }` / `{ data, count }` response shapes.

---

## Stage 1: Schema + Migration

### File: `backend/prisma/schema.prisma`

**New enum** (add after `ColumnType`):
```prisma
enum SheetPermission {
  EDITOR
  COMMENTER
  VIEWER
}
```

**New model: `SheetShare`** (add after `Sheet`):
```prisma
model SheetShare {
  id         Int               @id @default(autoincrement())
  sheetId    Int
  sheet      Sheet             @relation(fields: [sheetId], references: [id], onDelete: Cascade)
  userId     Int
  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission SheetPermission
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  @@unique([sheetId, userId])
  @@index([userId])
  @@map("sheet_shares")
}
```

**New model: `Comment`** (add after `Row`):
```prisma
model Comment {
  id              Int       @id @default(autoincrement())
  content         String
  authorId        Int
  author          User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  sheetId         Int
  sheet           Sheet     @relation(fields: [sheetId], references: [id], onDelete: Cascade)
  rowId           Int?
  row             Row?      @relation(fields: [rowId], references: [id], onDelete: Cascade)
  parentCommentId Int?
  parentComment   Comment?  @relation("CommentReplies", fields: [parentCommentId], references: [id], onDelete: Cascade)
  replies         Comment[] @relation("CommentReplies")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([sheetId])
  @@index([rowId])
  @@index([parentCommentId])
  @@map("comments")
}
```

**Add relation fields to existing models:**

| Model  | New fields                                                                 |
|--------|----------------------------------------------------------------------------|
| `User` | `shares   SheetShare[]` and `comments Comment[]`                          |
| `Sheet`| `shares   SheetShare[]` and `comments Comment[]`                          |
| `Row`  | `comments Comment[]`                                                       |

No existing fields, relations, or table names are removed or changed.

### Migration command
```
cd C:\Techtimize\backend
npx prisma migrate dev --name add_sheet_sharing_and_comments
npx prisma generate
```
This applies incrementally — no database reset.

---

## Stage 2: Authorization — Permission-Aware Access Checks

### New file: `backend/src/modules/sharing/permissions.service.js`

This service replaces the rigid ownership checks for sheet-level operations with effective-permission lookups. The existing `ownership.service.js` is **not modified** — workspace ownership remains unchanged.

**Core function: `getEffectivePermission(sheetId, userId)`**
1. Look up the sheet, including its workspace.
2. If `sheet.workspace.ownerId === userId` → return `'OWNER'`.
3. Else look up `SheetShare` for `{ sheetId, userId }` → return the `permission` value.
4. Else return `null` (no access).

**Permission-check functions:**

| Function                              | Logic                                                       |
|---------------------------------------|-------------------------------------------------------------|
| `assertCanView(sheetId, userId)`      | `getEffectivePermission` returns non-null (any role)        |
| `assertCanEdit(sheetId, userId)`      | `OWNER` or `EDITOR`                                         |
| `assertCanComment(sheetId, userId)`   | `OWNER`, `EDITOR`, or `COMMENTER`                           |
| `assertIsOwner(sheetId, userId)`      | `OWNER` only (for share management)                         |

Each function throws `NotFoundError` if the sheet doesn't exist, or `ForbiddenError` if the user lacks the required permission. The sheet object (with workspace) is returned so controllers can reuse it without a second query.

### Update existing controllers to use permission checks

The following controllers currently call `assertSheetOwnership(sheetId, userId)` which only allows the workspace owner. Update them to use the new permission functions:

**`sheets.controller.js`**
| Action        | Old check                 | New check                          |
|---------------|---------------------------|------------------------------------|
| `getById`     | `assertSheetOwnership`    | `assertCanView`                    |
| `update`      | `assertSheetOwnership`    | `assertCanEdit` (owner-only for rename is fine too, but edit is logical) |
| `remove`      | `assertSheetOwnership`    | `assertIsOwner`                    |
| `listByWorkspace` | `assertWorkspaceOwnership` | **Keep unchanged** — workspace listing is owner-only |
| `create`      | `assertWorkspaceOwnership` | **Keep unchanged** — creating sheets requires workspace ownership |

**`columns.controller.js`**
| Action        | Old check                 | New check                          |
|---------------|---------------------------|------------------------------------|
| `create`      | `assertSheetOwnership`    | `assertCanEdit`                    |
| `listBySheet` | `assertSheetOwnership`    | `assertCanView`                    |
| `update`      | `assertSheetOwnership` + `assertColumnOwnership` | `assertCanEdit` + keep `assertColumnOwnership` for cross-sheet validation |
| `remove`      | `assertSheetOwnership` + `assertColumnOwnership` | `assertCanEdit` + keep `assertColumnOwnership` |
| `insert`      | `assertSheetOwnership`    | `assertCanEdit`                    |

**`rows.controller.js`**
| Action        | Old check                 | New check                          |
|---------------|---------------------------|------------------------------------|
| `create`      | `assertSheetOwnership`    | `assertCanEdit`                    |
| `listBySheet` | `assertSheetOwnership`    | `assertCanView`                    |
| `getById`     | `assertSheetOwnership` + `assertRowOwnership` | `assertCanView` + keep `assertRowOwnership` |
| `update`      | `assertSheetOwnership` + `assertRowOwnership` | `assertCanEdit` + keep `assertRowOwnership` |
| `remove`      | `assertSheetOwnership` + `assertRowOwnership` | `assertCanEdit` + keep `assertRowOwnership` |

**`forms.controller.js`** — **Keep unchanged.** Form management remains owner-only via existing ownership checks. Forms are a workspace-level concern.

**Key point**: `assertColumnOwnership` and `assertRowOwnership` still verify that a column/row belongs to the correct sheet (preventing cross-sheet access). They don't need to change — they validate resource lineage, not user access. The sheet-level permission check is what changes.

### New file: `backend/src/modules/sharing/permissions.service.js` exports
```js
module.exports = { getEffectivePermission, assertCanView, assertCanEdit, assertCanComment, assertIsOwner };
```

---

## Stage 3: Sharing API

### New module: `backend/src/modules/sharing/`

**Files created:**
- `shares.service.js`
- `shares.controller.js`
- `shares.routes.js`

### Endpoints

| Method   | Path                                  | Auth | Owner-only | Description                       |
|----------|---------------------------------------|------|------------|-----------------------------------|
| `POST`   | `/sheets/:sheetId/shares`             | Yes  | Yes        | Share with a user by email        |
| `GET`    | `/sheets/:sheetId/shares`             | Yes  | Yes        | List shares for a sheet           |
| `PATCH`  | `/sheets/:sheetId/shares/:shareId`    | Yes  | Yes        | Update permission level           |
| `DELETE` | `/sheets/:sheetId/shares/:shareId`    | Yes  | Yes        | Revoke a share                    |
| `GET`    | `/sheets/shared-with-me`              | Yes  | N/A        | List sheets shared with the user  |

### Service logic: `shares.service.js`

- **`create({ sheetId, email, permission })`**
  - Validate permission is in `[EDITOR, COMMENTER, VIEWER]`.
  - Find user by email. Throw `NotFoundError` ("No registered user found with this email") if not found.
  - Verify the sheet exists and get workspace owner. Throw if sheet not found.
  - Prevent sharing with the owner: if `user.id === workspace.ownerId`, throw `BadRequestError("Cannot share a sheet with its owner")`.
  - Check for existing share: if `SheetShare` for `{ sheetId, userId }` exists, throw `AppError(409, "This user already has access to this sheet")`.
  - Create `SheetShare` record. Include user info in response.

- **`listBySheet(sheetId)`**
  - Return all shares with `include: { user: { select: { id, name, email } } }`.

- **`updateShare({ sheetId, shareId, permission })`**
  - Validate permission.
  - Verify the share belongs to this sheet (check `share.sheetId === parseInt(sheetId)`). Throw `NotFoundError` if not.
  - Update and return.

- **`removeShare({ sheetId, shareId })`**
  - Verify the share belongs to this sheet.
  - Delete.

- **`listSharedWithMe(userId)`**
  - Find all `SheetShare` records where `userId`, include `sheet` (with `workspace` and `_count.rows`).
  - Return enough info for the frontend: sheet id, name, workspace id/name, permission, owner name, shared date.

### Controller: `shares.controller.js`
- Each handler calls `assertIsOwner(sheetId, req.user.id)` before the service call (except `listSharedWithMe` which uses `req.user.id` directly).
- For `updateShare` and `removeShare`, also verify the share belongs to the specified sheet.

### Validation (in route file):
```js
// POST /sheets/:sheetId/shares
body('email').isEmail().withMessage('A valid email is required')
body('permission').isIn(['EDITOR', 'COMMENTER', 'VIEWER']).withMessage('Permission must be EDITOR, COMMENTER, or VIEWER')

// PATCH /sheets/:sheetId/shares/:shareId
body('permission').isIn(['EDITOR', 'COMMENTER', 'VIEWER']).withMessage('Permission must be EDITOR, COMMENTER, or VIEWER')
```

### Route registration in `app.js`

```js
const sharesRoutes = require('./modules/sharing/shares.routes');
// ...
app.use('/sheets', sharesRoutes);  // BEFORE sheetsRoutes to avoid /:id catching "shared-with-me"
```

The `/sheets/shared-with-me` route MUST be registered before `sheets.routes.js` (which has `GET /sheets/:id`) to prevent Express from matching `"shared-with-me"` as an `:id` parameter.

---

## Stage 4: Comments API

### New module: `backend/src/modules/comments/`

**Files created:**
- `comments.service.js`
- `comments.controller.js`
- `comments.routes.js`

### Endpoints

| Method   | Path                                            | Auth | Permission check       |
|----------|-------------------------------------------------|------|------------------------|
| `GET`    | `/sheets/:sheetId/comments`                     | Yes  | `assertCanView`        |
| `POST`   | `/sheets/:sheetId/comments`                     | Yes  | `assertCanComment`     |
| `GET`    | `/sheets/:sheetId/rows/:rowId/comments`          | Yes  | `assertCanView`        |
| `POST`   | `/sheets/:sheetId/rows/:rowId/comments`          | Yes  | `assertCanComment`     |
| `POST`   | `/comments/:commentId/replies`                   | Yes  | `assertCanComment` on parent's sheet |
| `PATCH`  | `/comments/:commentId`                           | Yes  | Owner or author        |
| `DELETE` | `/comments/:commentId`                           | Yes  | Owner or author        |

### Service logic: `comments.service.js`

- **`listSheetComments(sheetId)`**
  - Find top-level comments (`parentCommentId: null, rowId: null`) where `sheetId`.
  - Include: `author: { select: { id, name, email } }`, `replies: { include: { author } }`, ordered by `createdAt asc`.
  - Replies are nested under each top-level comment.

- **`listRowComments(sheetId, rowId)`**
  - Verify the row belongs to the sheet: find row where `id === rowId AND sheetId === sheetId`. Throw `NotFoundError` if not found.
  - Same query as above but with `rowId` filter instead of `rowId: null`.

- **`createSheetComment(sheetId, authorId, content)`**
  - Validate content (non-empty, max 2000 chars — matching a sensible limit).
  - Create comment with `rowId: null, parentCommentId: null`.
  - Include author info in response.

- **`createRowComment(sheetId, rowId, authorId, content)`**
  - Verify row belongs to sheet.
  - Validate content.
  - Create comment with `parentCommentId: null`.
  - Include author info.

- **`createReply(commentId, authorId, content)`**
  - Find parent comment. Throw `NotFoundError` if not found.
  - If `parentComment.parentCommentId` is not null → throw `BadRequestError("Cannot reply to a reply. Reply to the top-level comment instead.")`.
  - Validate content.
  - Create comment with `parentCommentId: commentId`, `sheetId: parent.sheetId`, `rowId: parent.rowId`.
  - Include author info.

- **`updateComment(commentId, userId, sheetId_from_parent, content)`**
  - Find comment with author and sheet info.
  - Permission check: user must be the comment author OR the sheet owner.
  - Validate content.
  - Update and return.

- **`deleteComment(commentId, userId)`**
  - Find comment with sheet (include workspace) info.
  - Permission check: user must be the comment author OR the sheet owner.
  - Delete.

### Controller: `comments.controller.js`
- Uses `assertCanView` / `assertCanComment` from `permissions.service.js` for read/write operations.
- For edit/delete, additionally checks author ownership or sheet ownership.
- `req.user.id` is always used as the author — never from request body.

### Validation (in route file):
```js
// POST comments, POST replies, PATCH comment
body('content').trim().notEmpty().withMessage('Comment content is required')
  .isLength({ max: 2000 }).withMessage('Comment content must not exceed 2000 characters')
```

### Route registration in `app.js`

```js
const commentsRoutes = require('./modules/comments/comments.routes');
// ...
app.use('/', commentsRoutes);
```

The comments routes include both `/sheets/:sheetId/comments`, `/sheets/:sheetId/rows/:rowId/comments`, and `/comments/:commentId/...` paths.

---

## Stage 5: Tests

### Approach

The project uses **PowerShell-based E2E tests** (`test-e2e.ps1`) against a live server — no Jest/Mocha. Create `test-sharing-comments.ps1` following the same conventions (using `Invoke-RestMethod`, color-coded output, sequential steps).

### Test scenarios

**Setup:**
1. Register/login User A (owner) and User B (shared user)
2. User A creates workspace + sheet

**Sharing tests:**
1. Owner shares sheet with User B as EDITOR
2. Duplicate share is rejected (409)
3. Sharing with unregistered email is rejected (404)
4. Sharing with owner is rejected (400)
5. Invalid permission role is rejected (400)
6. User B can view the shared sheet (GET /sheets/:id → 200)
7. User B (EDITOR) can create rows (POST → 201)
8. User B (EDITOR) can create columns (POST → 201)
9. Change User B to COMMENTER
10. User B (COMMENTER) cannot create rows (→ 403)
11. User B (COMMENTER) cannot create columns (→ 403)
12. Change User B to VIEWER
13. User B (VIEWER) cannot create rows (→ 403)
14. User B (VIEWER) cannot modify columns (→ 403)
15. List shares returns correct data
16. Revoke share → User B loses access (→ 403)
17. Unauthorized user cannot manage shares (→ 403)
18. GET /sheets/shared-with-me returns correct data

**Comment tests:**
1. Owner creates sheet-level comment
2. Owner creates row-level comment
3. User B (re-shared as COMMENTER) can view comments
4. User B can add comments
5. User B replies to a top-level comment
6. Reply to a reply is rejected (400)
7. Comment on a row from another sheet is rejected (404)
8. User B cannot edit owner's comment (→ 403)
9. Owner can delete any comment
10. User B can delete own comment
11. User B (as VIEWER) cannot add comments (→ 403)
12. Unauthenticated user cannot access comments (→ 401)

**Regression:**
1. Existing auth, workspace, sheet, column, row, and form endpoints continue working

### Execution
```
cd C:\Techtimize\backend
powershell -File test-sharing-comments.ps1
```
Report actual pass/fail results.

---

## Stage 6: Progress Tracking

### File: `C:\Techtimize\Progress.md`

Add **Sprint 6: Sheet Sharing & Comments** section with:
- Schema changes (new models, enum, relations)
- Migration name: `add_sheet_sharing_and_comments`
- New permission service and how it integrates
- All new endpoints (sharing + comments)
- Updated authorization behavior on existing endpoints
- Test results (actual pass/fail)
- Key decisions

---

## Files Summary

### New files (7)
| File | Purpose |
|------|---------|
| `backend/src/modules/sharing/shares.service.js` | Sharing CRUD service |
| `backend/src/modules/sharing/shares.controller.js` | Sharing request handlers |
| `backend/src/modules/sharing/shares.routes.js` | Sharing route definitions + validation |
| `backend/src/modules/sharing/permissions.service.js` | Effective permission resolution |
| `backend/src/modules/comments/comments.service.js` | Comment CRUD service |
| `backend/src/modules/comments/comments.controller.js` | Comment request handlers |
| `backend/src/modules/comments/comments.routes.js` | Comment route definitions + validation |

### Modified files (6)
| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add `SheetPermission` enum, `SheetShare` model, `Comment` model, new relations on `User`, `Sheet`, `Row` |
| `backend/src/app.js` | Import and mount `sharesRoutes` and `commentsRoutes` |
| `backend/src/modules/sheets/sheets.controller.js` | Replace `assertSheetOwnership` with permission-based checks |
| `backend/src/modules/columns/columns.controller.js` | Replace `assertSheetOwnership` with permission-based checks |
| `backend/src/modules/rows/rows.controller.js` | Replace `assertSheetOwnership` with permission-based checks |
| `Progress.md` | Add Sprint 6 section |

### Unchanged files
- `backend/src/middleware/auth.js` — no changes needed
- `backend/src/middleware/validate.js` — no changes needed
- `backend/src/middleware/errorHandler.js` — no changes needed
- `backend/src/utils/errors.js` — no changes needed
- `backend/src/modules/auth/ownership.service.js` — kept as-is for workspace ownership checks
- `backend/src/modules/workspaces/*` — no changes (workspace remains owner-only)
- `backend/src/modules/forms/*` — no changes (forms remain owner-only)

---

## Key Design Decisions

1. **Permission service is a separate module** — not merged into `ownership.service.js`. The ownership service handles workspace-level lineage checks; the permissions service handles sheet-level access. They serve different purposes.

2. **Route ordering for `/sheets/shared-with-me`** — the sharing routes are mounted in `app.js` before the sheets routes to prevent Express from matching `"shared-with-me"` as a sheet `:id` parameter.

3. **Comments module has its own routes** — both sheet-level and row-level comment endpoints live in `comments.routes.js`, not split across sheets/rows modules. This keeps comment logic self-contained.

4. **`assertColumnOwnership` and `assertRowOwnership` are retained** — they validate that a resource belongs to the expected sheet (lineage check), not user access. The permission check replaces only `assertSheetOwnership`.

5. **Owner can manage all comments; others only their own** — this is enforced in the comment `update`/`delete` service methods, not in a middleware.

6. **Testing uses PowerShell E2E scripts** — matching the existing `test-e2e.ps1` convention rather than introducing Jest.