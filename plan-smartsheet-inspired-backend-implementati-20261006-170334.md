# Smartsheet-Inspired Backend — Implementation Plan

## Summary
Build a complete Node.js + Express + PostgreSQL backend with JWT authentication, supporting users, workspaces, sheets (with columns and rows), and forms with public submission endpoints.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express 4.x
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: express-validator
- **Slugs**: crypto.randomBytes (built-in)
- **Environment**: dotenv

## Architecture
```
src/
├── config/
│   └── db.js                 # Prisma client singleton
├── middleware/
│   ├── auth.js              # JWT verification
│   ├── errorHandler.js      # Global error handler
│   └── validate.js          # Validation wrapper
├── utils/
│   ├── errors.js            # Custom error classes
│   └── slug.js              # Slug generator
├── modules/
│   ├── auth/
│   │   ├── auth.service.js
│   │   ├── auth.controller.js
│   │   ├── auth.routes.js
│   │   └── ownership.service.js  # Shared ownership checks
│   ├── workspaces/
│   ├── sheets/
│   ├── columns/
│   ├── rows/
│   └── forms/
├── app.js                   # Express app factory
└── server.js               # Entry point
```

## Database Schema (Prisma)
- **User**: id, name, email (unique), password, timestamps
- **Workspace**: id, name, ownerId (FK→User), timestamps
- **Sheet**: id, name, workspaceId (FK→Workspace), timestamps
- **Column**: id, sheetId (FK→Sheet), name, type (enum: TEXT/NUMBER/BOOLEAN/DATE), position, timestamps
- **Row**: id, sheetId (FK→Sheet), values (JSON), timestamps
- **Form**: id, sheetId (FK→Sheet), name, description, fields (JSON), publicSlug (unique), isActive, timestamps

## API Endpoints

### Auth (public)
- `POST /auth/register` → create user, return token
- `POST /auth/login` → authenticate, return token
- `GET /auth/me` → current user (protected)

### Workspaces (protected, owner-only)
- `GET /workspaces` → list user's workspaces
- `POST /workspaces` → create workspace
- `GET /workspaces/:id` → get workspace
- `PUT /workspaces/:id` → update workspace
- `DELETE /workspaces/:id` → delete workspace

### Sheets (protected, nested under workspace)
- `POST /workspaces/:workspaceId/sheets` → create sheet
- `GET /workspaces/:workspaceId/sheets` → list sheets
- `GET /sheets/:id` → get sheet
- `PUT /sheets/:id` → update sheet
- `DELETE /sheets/:id` → delete sheet

### Columns (protected, nested under sheet)
- `POST /sheets/:sheetId/columns` → create column
- `GET /sheets/:sheetId/columns` → list columns
- `PUT /sheets/:sheetId/columns/:columnId` → update column
- `DELETE /sheets/:sheetId/columns/:columnId` → delete column

### Rows (protected, nested under sheet)
- `POST /sheets/:sheetId/rows` → create row (with validation)
- `GET /sheets/:sheetId/rows` → list rows
- `GET /sheets/:sheetId/rows/:rowId` → get row
- `PUT /sheets/:sheetId/rows/:rowId` → update row (with validation)
- `DELETE /sheets/:sheetId/rows/:rowId` → delete row

### Forms (protected management)
- `POST /sheets/:sheetId/forms` → create form (auto-generates slug)
- `GET /sheets/:sheetId/forms` → list forms
- `GET /forms/:id` → get form
- `PUT /forms/:id` → update form
- `DELETE /forms/:id` → delete form
- `PATCH /forms/:id/toggle` → toggle isActive

### Public Forms (no auth)
- `GET /public/forms/:slug` → get active form
- `POST /public/forms/:slug/submit` → submit form → creates row

## Implementation Phases

### Phase 1: Project Scaffolding
- Initialize package.json with dependencies
- Create .env, .env.example, .gitignore
- Write Prisma schema (prisma/schema.prisma)
- Generate Prisma client

### Phase 2: Core Plumbing
- Database client singleton (src/config/db.js)
- Custom error classes (src/utils/errors.js)
- Slug generator (src/utils/slug.js)
- Auth middleware (src/middleware/auth.js)
- Error handler middleware (src/middleware/errorHandler.js)
- Validation wrapper (src/middleware/validate.js)

### Phase 3: Auth Module
- Auth service (register, login, getMe)
- Auth controller
- Auth routes
- Ownership service (shared helpers for workspace/sheet ownership checks)

### Phase 4: Workspaces Module
- Service (CRUD with ownership checks)
- Controller
- Routes

### Phase 5: Sheets Module
- Service (CRUD with workspace ownership)
- Controller
- Routes (nested under workspace)

### Phase 6: Columns Module
- Service (CRUD with type validation, auto-position)
- Controller
- Routes

### Phase 7: Rows Module
- Service (CRUD with column-type validation)
- Controller
- Routes

### Phase 8: Forms + Public Submission
- Service (CRUD, toggle, public form retrieval, submission)
- Controller
- Routes (protected management + public endpoints)

### Phase 9: App Assembly
- Wire all routes in app.js
- Create server.js entry point

### Phase 10: Database & Testing
- Run `npx prisma migrate dev --name init`
- Start server
- Execute full cURL test flow (register → login → create workspace → create sheet → add columns → add row → create form → submit public form → verify row created)

### Phase 11: Documentation
- Write README.md with setup instructions and cURL examples
- Create Progress.md to track implementation progress

## Files to Create (33 total)
1. package.json
2. .env
3. .env.example
4. .gitignore
5. prisma/schema.prisma
6. src/config/db.js
7. src/utils/errors.js
8. src/utils/slug.js
9. src/middleware/auth.js
10. src/middleware/errorHandler.js
11. src/middleware/validate.js
12. src/modules/auth/auth.service.js
13. src/modules/auth/auth.controller.js
14. src/modules/auth/auth.routes.js
15. src/modules/auth/ownership.service.js
16. src/modules/workspaces/workspaces.service.js
17. src/modules/workspaces/workspaces.controller.js
18. src/modules/workspaces/workspaces.routes.js
19. src/modules/sheets/sheets.service.js
20. src/modules/sheets/sheets.controller.js
21. src/modules/sheets/sheets.routes.js
22. src/modules/columns/columns.service.js
23. src/modules/columns/columns.controller.js
24. src/modules/columns/columns.routes.js
25. src/modules/rows/rows.service.js
26. src/modules/rows/rows.controller.js
27. src/modules/rows/rows.routes.js
28. src/modules/forms/forms.service.js
29. src/modules/forms/forms.controller.js
30. src/modules/forms/forms.routes.js
31. src/app.js
32. src/server.js
33. Progress.md

## Verification
End-to-end cURL flow: register user → login → create workspace → create sheet → add columns → add row manually → create form → submit form via public slug (no auth) → verify new row created.

## Non-Goals
No frontend, no websockets, no dashboards/Gantt/Kanban, no formulas, no notifications, no workspace sharing, no advanced roles. Schema designed to allow these features to be added later without redesign.