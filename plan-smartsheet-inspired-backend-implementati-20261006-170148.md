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

### 5.7 Authorization helper (in auth/ownership.service.js)
```js
async function assertOwnership(workspaceId, userId) {
  const ws = await prisma.workspace.findUnique({ where: { id: +workspaceId } });
  if (!ws) throw new NotFoundError('Workspace not found');
  if (ws.ownerId !== userId) throw new ForbiddenError();
  return ws;
}

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

### 6.5 Rows module — value validation
`validateRowValues(sheetId, values)`:
1. Fetch all columns for `sheetId`.
2. For each key in `values`: key must match a column id (string form) → else 400 "unknown column"
3. Type check each value:
   - `TEXT`: must be string
   - `NUMBER`: must be number and finite
   - `BOOLEAN`: must be boolean
   - `DATE`: must be ISO-8601 parseable
4. Return normalized values object.

### 6.6 Forms module
- `create(sheetId, userId, { name, description, fields })`:
  - Assert sheet ownership
  - Validate each `field.columnId` exists in sheet's columns
  - Generate unique `publicSlug`
  - Persist with `isActive: true`
- `toggle(formId, userId)` → flip `isActive`

### 6.7 Public forms (in forms module)
- `GET /public/forms/:slug`: fetch form with `isActive: true` + include `sheet.columns`
- `POST /public/forms/:slug/submit`: validate fields, enforce required, type-check, create row on sheet

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
app.use('/', workspacesRoutes);   // mounts /workspaces and /workspaces/:id/sheets
app.use('/sheets', sheetsRoutes);
app.use('/sheets', columnsRoutes);
app.use('/sheets', rowsRoutes);
app.use('/', formsRoutes);        // mounts /sheets/:id/forms, /forms/:id, /public/forms/:slug

app.get('/health', (req, res) => res.json({ ok: true }));
app.use(notFoundHandler);
app.use(errorHandler);
module.exports = app;
```

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

### Phase 1 — Scaffolding
1. `npm init -y` → write `package.json`
2. Install deps
3. Create `.env`, `.env.example`, `.gitignore`
4. Write `prisma/schema.prisma`
5. `npx prisma generate`

### Phase 2 — Core plumbing
1. `src/config/db.js`
2. `src/utils/errors.js`, `src/utils/slug.js`
3. `src/middleware/auth.js`, `errorHandler.js`, `validate.js`

### Phase 3 — Auth module
1. `modules/auth/*` (service, controller, routes, ownership helpers)
2. Wire into `app.js`

### Phase 4 — Workspaces module
1. `modules/workspaces/*`

### Phase 5 — Sheets module
1. `modules/sheets/*`

### Phase 6 — Columns module
1. `modules/columns/*`

### Phase 7 — Rows module
1. `modules/rows/*`

### Phase 8 — Forms + Public Submission
1. `modules/forms/*`

### Phase 9 — App Assembly & E2E
1. Wire all routes in `app.js`
2. `src/server.js`
3. `npx prisma migrate dev --name init`
4. Run full cURL flow

### Phase 10 — Documentation
1. `README.md` with setup + cURL examples
2. `Progress.md`

---

## 10. Verification — Full cURL Flow

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

# 6. Create columns (TEXT, NUMBER, BOOLEAN, DATE)
curl -X POST $BASE/sheets/1/columns \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Name","type":"TEXT"}'

# 7. Add row manually
curl -X POST $BASE/sheets/1/rows \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"values":{"1":"Ali","2":"ali@example.com","3":"Active"}}'

# 8. Create form → returns publicSlug
curl -X POST $BASE/sheets/1/forms \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Contact form","fields":[{"columnId":1,"required":true}]}'

# 9. Fetch public form (no auth)
curl $BASE/public/forms/<SLUG>

# 10. Submit form (no auth) → creates a row
curl -X POST $BASE/public/forms/<SLUG>/submit \
  -H "Content-Type: application/json" \
  -d '{"values":{"1":"Bob","2":"bob@example.com","3":"New"}}'

# 11. Verify new row exists
curl $BASE/sheets/1/rows -H "Authorization: Bearer $TOKEN"
```

---

## 11. Response Conventions

**Success (list):** `{ "data": [ ... ], "count": 5 }`
**Success (single):** `{ "data": { ... } }`
**Create:** HTTP 201 | **Delete:** HTTP 204 empty body
**Auth:** `{ user, token }` at top level
**Error:** `{ "error": { "status": 400, "message": "...", "details": [...] } }`

---

## 12. Files to Create (32 total)

1. `package.json`
2. `.env`
3. `.env.example`
4. `.gitignore`
5. `README.md`
6. `prisma/schema.prisma`
7. `src/config/db.js`
8. `src/utils/errors.js`
9. `src/utils/slug.js`
10. `src/middleware/auth.js`
11. `src/middleware/errorHandler.js`
12. `src/middleware/validate.js`
13. `src/modules/auth/auth.service.js`
14. `src/modules/auth/auth.controller.js`
15. `src/modules/auth/auth.routes.js`
16. `src/modules/auth/ownership.service.js`
17. `src/modules/workspaces/workspaces.service.js`
18. `src/modules/workspaces/workspaces.controller.js`
19. `src/modules/workspaces/workspaces.routes.js`
20. `src/modules/sheets/sheets.service.js`
21. `src/modules/sheets/sheets.controller.js`
22. `src/modules/sheets/sheets.routes.js`
23. `src/modules/columns/columns.service.js`
24. `src/modules/columns/columns.controller.js`
25. `src/modules/columns/columns.routes.js`
26. `src/modules/rows/rows.service.js`
27. `src/modules/rows/rows.controller.js`
28. `src/modules/rows/rows.routes.js`
29. `src/modules/forms/forms.service.js`
30. `src/modules/forms/forms.controller.js`
31. `src/modules/forms/forms.routes.js`
32. `src/app.js`
33. `src/server.js`
34. `Progress.md`

---

## 13. Non-Goals (Confirmed)

No frontend, no websockets, no dashboards/Gantt/Kanban, no formulas, no notifications, no sharing/collab, no advanced roles. Schema and module boundaries are designed so these can slot in later without redesign.

---

## 14. Progress Tracking

`Progress.md` will be updated at the end of each phase with: phase number, files created, cURL commands verified, blockers, and next-phase preview.