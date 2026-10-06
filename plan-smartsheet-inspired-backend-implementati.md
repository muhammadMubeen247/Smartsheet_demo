# Smartsheet-Inspired Backend — Implementation Plan

## Goal
Build a greenfield Node.js + Express + PostgreSQL backend at `C:\Techtimize` with users, workspaces, sheets, columns, rows, and forms. Auth via JWT. Public form submission via unique slug. Backend-only — verified end-to-end with cURL.

---

## 1. Technology Choices

| Concern | Choice | Reason |
|---|---|---|
| Runtime | Node.js (LTS) | Spec |
| Framework | Express 4 | Spec |
| DB | PostgreSQL | Spec |
| ORM | **Prisma** | Schema-first, typed client, migrations built-in |
| Auth | **JWT** (access token) + **bcryptjs** for hashes | Stateless, REST-friendly |
| Slugs | `crypto.randomBytes` (no extra dep, CJS-safe) | Avoids nanoid ESM-only v5 issue |
| Validation | **express-validator** | Declarative, middleware-friendly |
| Env | **dotenv** | Spec |
| Dev | **nodemon**, **prisma** | DX |

---

## 2. Directory Structure

```
C:\Techtimize\
├── .env
├── .env.example
├── .gitignore
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/           (auto-generated)
├── src/
│   ├── server.js             # entry point
│   ├── app.js                # express app factory
│   ├── config/
│   │   └── db.js             # PrismaClient singleton
│   ├── middleware/
│   │   ├── auth.js           # JWT verify, sets req.user
│   │   ├── errorHandler.js   # global error handler
│   │   └── validate.js       # express-validator wrapper
│   ├── utils/
│   │   ├── errors.js         # AppError, NotFoundError, ForbiddenError
│   │   └── slug.js           # generateSlug()
│   └── modules/
│       ├── auth/
│       │   ├── auth.routes.js
│       │   ├── auth.controller.js
│       │   └── auth.service.js
│       ├── workspaces/
│       │   ├── workspaces.routes.js
│       │   ├── workspaces.controller.js
│       │   └── workspaces.service.js
│       ├── sheets/
│       │   ├── sheets.routes.js
│       │   ├── sheets.controller.js
│       │   └── sheets.service.js
│       ├── columns/
│       │   ├── columns.routes.js
│       │   ├── columns.controller.js
│       │   └── columns.service.js
│       ├── rows/
│       │   ├── rows.routes.js
│       │   ├── rows.controller.js
│       │   └── rows.service.js
│       └── forms/
│           ├── forms.routes.js
│           ├── forms.controller.js
│           └── forms.service.js
├── Progress.md
└── README.md
```

---

## 3. Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int         @id @default(autoincrement())
  name         String
  email        String      @unique
  password     String      // bcrypt hash
  workspaces   Workspace[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@map("users")
}

model Workspace {
  id        Int      @id @default(autoincrement())
  name      String
  ownerId   Int
  owner     User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  sheets    Sheet[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("workspaces")
}

model Sheet {
  id          Int       @id @default(autoincrement())
  name        String
  workspaceId Int
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  columns     Column[]
  rows        Row[]
  forms       Form[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("sheets")
}

model Column {
  id        Int        @id @default(autoincrement())
  sheetId   Int
  sheet     Sheet      @relation(fields: [sheetId], references: [id], onDelete: Cascade)
  name      String
  type      ColumnType @default(TEXT)
  position  Int
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@unique([sheetId, position])
  @@unique([sheetId, name])
  @@map("columns")
}

enum ColumnType {
  TEXT
  NUMBER
  BOOLEAN
  DATE
}

model Row {
  id        Int      @id @default(autoincrement())
  sheetId   Int
  sheet     Sheet    @relation(fields: [sheetId], references: [id], onDelete: Cascade)
  values    Json     // { [columnId: string]: primitive }
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("rows")
}

model Form {
  id          Int      @id @default(autoincrement())
  sheetId     Int
  sheet       Sheet    @relation(fields: [sheetId], references: [id], onDelete: Cascade)
  name        String
  description String?
  fields      Json     // [{ columnId: number, required: boolean }]
  publicSlug  String   @unique
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("forms")
}
```

**Design notes**
- `Row.values` is JSON keyed by column id (string), so values are column-type validated at the service layer, not in the schema.
- `Form.fields` is JSON array describing which columns the form collects and whether each is required.
- `onDelete: Cascade` everywhere a child can't exist without its parent (sheet→columns, sheet→rows, sheet→forms, workspace→sheets).

---

## 4. API Routes

```
# Auth
POST   /auth/register        → createUser (returns user + token)
POST   /auth/login           → returns user + token
GET    /auth/me              → current user (auth)

# Workspaces
GET    /workspaces           → list my workspaces (auth)
POST   /workspaces           → create workspace (auth)
GET    /workspaces/:id       → get one (auth, owner only)
PUT    /workspaces/:id       → update (auth, owner only)
DELETE /workspaces/:id       → delete (auth, owner only)

# Sheets (nested under workspace for creation/listing)
POST   /workspaces/:workspaceId/sheets  → create sheet (auth, owner)
GET    /workspaces/:workspaceId/sheets  → list sheets (auth, owner)
GET    /sheets/:sheetId                 → get sheet w/ columns (auth, owner)
PUT    /sheets/:sheetId                 → update (auth, owner)
DELETE /sheets/:sheetId                 → delete (auth, owner)

# Columns
GET    /sheets/:sheetId/columns            → list (auth, owner)
POST   /sheets/:sheetId/columns            → create (auth, owner)
PUT    /sheets/:sheetId/columns/:columnId  → update (auth, owner)
DELETE /sheets/:sheetId/columns/:columnId  → delete (auth, owner)

# Rows
GET    /sheets/:sheetId/rows               → list (auth, owner)
POST   /sheets/:sheetId/rows               → create w/ validated values (auth, owner)
GET    /sheets/:sheetId/rows/:rowId        → get (auth, owner)
PUT    /sheets/:sheetId/rows/:rowId        → update w/ validated values (auth, owner)
DELETE /sheets/:sheetId/rows/:rowId        → delete (auth, owner)

# Forms (authenticated management)
GET    /sheets/:sheetId/forms              → list (auth, owner)
POST   /sheets/:sheetId/forms              → create, auto-generate slug (auth, owner)
GET    /forms/:formId                      → get (auth, owner)
PUT    /forms/:formId                      → update (auth, owner)
DELETE /forms/:formId                      → delete (auth, owner)
PATCH  /forms/:formId/toggle               → flip isActive (auth, owner)

# Public form submission (NO auth)
GET    /public/forms/:slug                 → form info (active only)
POST   /public/forms/:slug/submit          → validate + create row in sheet
```

The public routes live under `/public/forms/:slug` to avoid colliding with `/forms/:formId`.

---

## 5. Core Building Blocks

### 5.1 `src/config/db.js`
Single `PrismaClient` instance, exported.

### 5.2 `src/utils/errors.js`
```js
class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
class NotFoundError extends AppError { constructor(msg='Not found') { super(404, msg); } }
class ForbiddenError extends AppError { constructor(msg='Forbidden') { super(403, msg); } }
class BadRequestError extends AppError { constructor(msg='Bad request') { super(400, msg); } }
```

### 5.3 `src/utils/slug.js`
`generateSlug()` → `crypto.randomBytes(5).toString('hex')` (10 char hex, plenty of entropy).

### 5.4 `src/middleware/auth.js`
- Reads `Authorization: Bearer <token>`
- Verifies with `jsonwebtoken` using `process.env.JWT_SECRET`
- Sets `req.user = { id, email }`
- Returns 401 on missing/invalid

### 5.5 `src/middleware/errorHandler.js`
Catches thrown errors (and async errors via wrapper), returns `{ error: { status, message } }`. In dev, includes stack.

### 5.6 `src/middleware/validate.js`
Wraps `express-validator`'s `validationResult` and throws `BadRequestError` with field-level details on failure.

### 5.7 Authorization helper (in workspaces.service)
```js
async function assertOwnership(workspaceId, userId) {
  const ws = await prisma.workspace.findUnique({ where: { id: +workspaceId } });
  if (!ws) throw new NotFoundError('Workspace not found');
  if (ws.ownerId !== userId) throw new ForbiddenError();
  return ws;
}

// For sheet/column/row/form IDs, resolve upward to the workspace owner:
async function assertSheetOwnership(sheetId, userId) {
  const sheet = await prisma.sheet.findUnique({
    where: { id: +sheetId }, include: { workspace: true }
  });
  if (!sheet) throw new NotFoundError('Sheet not found');
  if (sheet.workspace.ownerId !== userId) throw new ForbiddenError();
  return sheet;
}
```
Similar helpers for `columnId`, `rowId`, `formId`. Exported from a shared `modules/auth/ownership.service.js` to avoid duplication.

---

## 6. Module Details

### 6.1 Auth module
**Service (`auth.service.js`)**
- `register({ name, email, password })` → validate unique email, bcrypt hash (10 rounds), create user, sign JWT, return `{ user, token }`
- `login({ email, password })` → find user, bcrypt compare, sign JWT, return `{ user, token }`
- `getMe(userId)` → return user (no password)

**JWT payload**: `{ id, email }`, expires in 7d.

**Controller**: thin — calls service, sends response.
**Routes**: uses `validate.js` middleware for email/name/password.

### 6.2 Workspaces module
- `create(userId, name)`
- `listByOwner(userId)`
- `getById(workspaceId, userId)` (with ownership check)
- `update(workspaceId, userId, name)`
- `remove(workspaceId, userId)`

### 6.3 Sheets module
- All ops verify workspace ownership before proceeding.
- `getById` returns included `columns` and `_count.rows`.

### 6.4 Columns module
- On create: validate `type` is one of `TEXT|NUMBER|BOOLEAN|DATE`, auto-assign `position` if not provided (max+1).
- Enforce `@@unique([sheetId, name])` — catch Prisma `P2002` and return 409.
- On delete, cascade handled by DB.

### 6.5 Rows module — value validation
`validateRowValues(sheetId, values)`:
1. Fetch all columns for `sheetId`.
2. For each key in `values`:
   - key must match a column id (string form) → else 400 "unknown column"
3. Type check each value:
   - `TEXT`: must be string
   - `NUMBER`: must be number and finite
   - `BOOLEAN`: must be boolean
   - `DATE`: must be ISO-8601 parseable (`new Date(v)` not Invalid)
4. Return normalized values object.

### 6.6 Forms module
- `create(sheetId, userId, { name, description, fields })`:
  - Assert sheet ownership
  - Validate each `field.columnId` exists in sheet's columns
  - Generate unique `publicSlug` (retry on collision, astronomically unlikely)
  - Persist with `isActive: true`
- `toggle(formId, userId)` → flip `isActive`
- `remove` / `update` verify ownership via sheet.workspace.owner chain

### 6.7 Public forms (in forms module)
- `GET /public/forms/:slug`:
  - Fetch form with `isActive: true` + include `sheet.columns`
  - Return `{ name, description, fields, columns }` (no internal ids leak beyond columnId)
  - 404 if missing/inactive
- `POST /public/forms/:slug/submit`:
  - Body: `{ values: { [columnId]: value } }`
  - Only accept values for columns referenced in `form.fields` (reject extras)
  - Enforce `required` per form field
  - Run type validation from 6.5
  - Create row on the sheet
  - Return 201 with the new row id

---

## 7. App Assembly

### `src/app.js`
```js
const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const workspacesRoutes = require('./modules/workspaces/workspaces.routes');
const sheetsRoutes = require('./modules/sheets/sheets.routes');
const columnsRoutes = require('./modules/columns/columns.routes');
const rowsRoutes = require('./modules/rows/rows.routes');
const formsRoutes = require('./modules/forms/forms.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/auth', authRoutes);
app.use('/workspaces', workspacesRoutes);
app.use('/sheets', sheetsRoutes);         // for /sheets/:id ops
app.use('/workspaces', sheetsRoutes);     // for nested sheet creation/listing
app.use('/sheets', columnsRoutes);
app.use('/sheets', rowsRoutes);
app.use('/sheets', formsRoutes);          // nested form create/list
app.use('/forms', formsRoutes);           // /forms/:id management
app.use('/public/forms', formsRoutes);    // public routes (split inside router)

app.get('/health', (req, res) => res.json({ ok: true }));
app.use(notFoundHandler);
app.use(errorHandler);
module.exports = app;
```

(Router mounting will be refined per-module — each module file exports one Router; the app mounts them at the correct base paths.)

### `src/server.js`
```js
require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
```

---

## 8. Configuration

### `.env`
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smartsheet_demo"
JWT_SECRET="<random-64-char-string>"
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
```

### `.env.example` — same keys, placeholder values (no real secrets).

### `.gitignore`
```
node_modules/
.env
prisma/migrations/
dist/
*.log
```

### `package.json` scripts
```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "node prisma/seed.js"
  }
}
```

---

## 9. Implementation Order (Phases)

Each phase ends with a working, testable state. Progress recorded in `Progress.md` after each.

### Phase 1 — Scaffolding
1. `npm init -y`
2. `npm i express @prisma/client bcryptjs cors dotenv express-validator jsonwebtoken`
3. `npm i -D prisma nodemon`
4. Create `.env`, `.env.example`, `.gitignore`, `README.md`
5. Write `prisma/schema.prisma`
6. `npx prisma generate` (no migrate yet — DB comes up in Phase 9)

### Phase 2 — Core plumbing
1. `src/config/db.js`
2. `src/utils/errors.js`, `src/utils/slug.js`
3. `src/middleware/auth.js`, `errorHandler.js`, `validate.js`
4. `src/app.js`, `src/server.js` with just `/health`

### Phase 3 — Auth module
1. `modules/auth/*` (service, controller, routes)
2. Wire into `app.js`
3. cURL: register, login, `/auth/me`

### Phase 4 — Workspaces
1. `modules/workspaces/*`
2. cURL: CRUD

### Phase 5 — Sheets
1. `modules/sheets/*` (incl. nested routes under `/workspaces/:id/sheets`)
2. cURL: CRUD

### Phase 6 — Columns
1. `modules/columns/*`
2. cURL: CRUD with each type

### Phase 7 — Rows
1. `modules/rows/*` including `validateRowValues`
2. cURL: create row, try invalid values (reject)

### Phase 8 — Forms + Public Submission
1. `modules/forms/*` including public routes
2. cURL: create form → get slug → unauthenticated submit → verify row

### Phase 9 — Database bring-up & E2E
1. Start PostgreSQL (user must have it available locally or via Docker)
2. `npx prisma migrate dev --name init`
3. Run full flow script (sequence of cURL commands)
4. Record in `Progress.md`

### Phase 10 — Polish
1. `README.md` with setup instructions + cURL examples for full flow
2. Final `Progress.md` entry

---

## 10. Verification — Full cURL Flow

The `README.md` will include this exact sequence, parameterized by `$TOKEN`:

```bash
BASE=http://localhost:3000

# 1. Register
curl -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ali","email":"ali@example.com","password":"secret123"}'

# 2. Login → capture token
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@example.com","password":"secret123"}' | jq -r .token)

# 3. Me
curl $BASE/auth/me -H "Authorization: Bearer $TOKEN"

# 4. Create workspace
curl -X POST $BASE/workspaces \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Project Alpha"}'

# 5. Create sheet
curl -X POST $BASE/workspaces/1/sheets \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Contacts"}'

# 6. Create columns
curl -X POST $BASE/sheets/1/columns -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Name","type":"TEXT"}'
curl -X POST $BASE/sheets/1/columns -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Email","type":"TEXT"}'
curl -X POST $BASE/sheets/1/columns -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Status","type":"TEXT"}'

# 7. Add a row manually
curl -X POST $BASE/sheets/1/rows -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"values":{"1":"Ali","2":"ali@example.com","3":"Active"}}'

# 8. Create a form → returns publicSlug
curl -X POST $BASE/sheets/1/forms -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Contact form","description":"Fill me","fields":[{"columnId":1,"required":true},{"columnId":2,"required":true},{"columnId":3,"required":false}]}'

# 9. Fetch public form (no auth)
curl $BASE/public/forms/<SLUG>

# 10. Submit form (no auth) → creates a row
curl -X POST $BASE/public/forms/<SLUG>/submit \
  -H "Content-Type: application/json" \
  -d '{"values":{"1":"Bob","2":"bob@example.com","3":"New"}}'

# 11. Verify new row exists
curl $BASE/sheets/1/rows -H "Authorization: Bearer $TOKEN"
```

Authorization negative tests (User B can't touch User A's resources) will also be scripted.

---

## 11. Response Conventions

**Success (list):**
```json
{ "data": [ ... ], "count": 5 }
```

**Success (single):**
```json
{ "data": { ... } }
```

**Success (create):** HTTP 201
**Success (delete):** HTTP 204, empty body
**Auth:** returns `{ user, token }` at top level (not wrapped)

**Error:**
```json
{ "error": { "status": 400, "message": "...", "details": [...] } }
```

HTTP status codes: 200, 201, 204, 400, 401, 403, 404, 409, 500.

---

## 12. Non-Goals (Confirmed)

No frontend, no websockets, no dashboards/Gantt/Kanban, no formulas, no notifications, no sharing/collab, no advanced roles. Schema and module boundaries are designed so these can slot in later (e.g. `WorkspaceMember` join table for sharing, `Automation` model for workflows) without redesign.

---

## 13. Files to Create (complete list)

1. `package.json`
2. `.env`, `.env.example`, `.gitignore`
3. `README.md`
4. `prisma/schema.prisma`
5. `src/config/db.js`
6. `src/utils/errors.js`
7. `src/utils/slug.js`
8. `src/middleware/auth.js`
9. `src/middleware/errorHandler.js`
10. `src/middleware/validate.js`
11. `src/modules/auth/auth.service.js`
12. `src/modules/auth/auth.controller.js`
13. `src/modules/auth/auth.routes.js`
14. `src/modules/auth/ownership.service.js` (shared ownership helpers)
15. `src/modules/workspaces/workspaces.service.js`
16. `src/modules/workspaces/workspaces.controller.js`
17. `src/modules/workspaces/workspaces.routes.js`
18. `src/modules/sheets/sheets.service.js`
19. `src/modules/sheets/sheets.controller.js`
20. `src/modules/sheets/sheets.routes.js`
21. `src/modules/columns/columns.service.js`
22. `src/modules/columns/columns.controller.js`
23. `src/modules/columns/columns.routes.js`
24. `src/modules/rows/rows.service.js`
25. `src/modules/rows/rows.controller.js`
26. `src/modules/rows/rows.routes.js`
27. `src/modules/forms/forms.service.js`
28. `src/modules/forms/forms.controller.js`
29. `src/modules/forms/forms.routes.js`
30. `src/app.js`
31. `src/server.js`
32. `Progress.md`

**Total: 32 files.**

---

## 14. Progress Tracking

`Progress.md` will be updated at the end of each phase with:
- Phase number & name
- Files created/changed
- cURL commands verified
- Any blockers encountered
- Next-phase preview