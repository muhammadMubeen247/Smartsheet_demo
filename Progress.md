# Progress Log

## Sprint 1: Backend MVP

### Phase 1: Project Initialization
- Initialized Node.js project with `npm init -y`
- Installed dependencies: express, @prisma/client, prisma, bcryptjs, jsonwebtoken, cors, dotenv, express-validator, nodemon
- Created `.env` with database connection string and JWT secret
- Created `.env.example` as a template
- Created `.gitignore` (node_modules, .env, prisma/migrations)

### Phase 2: Database Schema (Prisma)
- Created `prisma/schema.prisma` with models:
  - **User**: id, name, email (unique), password, workspaces relation
  - **Workspace**: id, name, ownerId (FK to User), sheets relation
  - **Sheet**: id, name, workspaceId (FK), columns/rows/forms relations
  - **Column**: id, sheetId (FK), name, type (enum: TEXT/NUMBER/BOOLEAN/DATE), position
  - **Row**: id, sheetId (FK), values (JSON)
  - **Form**: id, sheetId (FK), name, description, fields (JSON), publicSlug (unique), isActive
- Cascade deletes configured on all foreign keys
- Unique constraints on `[sheetId, position]` and `[sheetId, name]` for columns

### Phase 3: Core Infrastructure
- `src/config/db.js` — Prisma client singleton
- `src/utils/errors.js` — Custom error classes: `AppError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`
- `src/utils/slug.js` — Generates URL-safe random slugs for public forms
- `src/middleware/auth.js` — JWT verification middleware, attaches `req.user`
- `src/middleware/errorHandler.js` — Global error handler + 404 handler
- `src/middleware/validate.js` — Wraps express-validator results, throws ValidationError on failure

### Phase 4: Authentication Module
- `src/modules/auth/auth.service.js` — register, login, getUserById (password hashing via bcryptjs)
- `src/modules/auth/auth.controller.js` — request handlers for register, login, me
- `src/modules/auth/auth.routes.js` — POST /auth/register, POST /auth/login, GET /auth/me
- `src/modules/auth/ownership.service.js` — assertWorkspaceOwnership, assertSheetOwnership, assertFormOwnership

### Phase 5: Workspaces Module
- `src/modules/workspaces/workspaces.service.js` — CRUD operations scoped to owner
- `src/modules/workspaces/workspaces.controller.js` — request handlers
- `src/modules/workspaces/workspaces.routes.js` — mounted at /workspaces, all routes require auth

### Phase 6: Sheets Module
- `src/modules/sheets/sheets.service.js` — CRUD scoped to workspace owner
- `src/modules/sheets/sheets.controller.js` — request handlers
- `src/modules/sheets/sheets.routes.js` — nested routes under workspaces and standalone

### Phase 7: Columns Module
- `src/modules/columns/columns.service.js` — CRUD with auto-position calculation
- `src/modules/columns/columns.controller.js` — request handlers
- `src/modules/columns/columns.routes.js` — nested under /sheets/:sheetId/columns

### Phase 8: Rows Module
- `src/modules/rows/rows.service.js` — CRUD with JSON values storage
- `src/modules/rows/rows.controller.js` — request handlers
- `src/modules/rows/rows.routes.js` — nested under /sheets/:sheetId/rows
- **Type validation** implemented: validates row values against column types before save
  - TEXT: must be string
  - NUMBER: must be number
  - BOOLEAN: must be boolean
  - DATE: must be valid date string

### Phase 9: Forms Module
- `src/modules/forms/forms.service.js` — Form CRUD, public slug generation, toggle active/inactive, public form lookup by slug, public form submission (creates row)
- `src/modules/forms/forms.controller.js` — request handlers for both authenticated and public endpoints
- `src/modules/forms/forms.routes.js` — authenticated routes for form management
- `src/modules/forms/publicForms.routes.js` — unauthenticated routes for public form access and submission

### Phase 10: Route Wiring + Server Setup
- `src/app.js` — Express app with CORS, JSON parsing, route mounting, error handling
- `src/server.js` — Entry point, listens on configured port
- **Route ordering fix**: public forms routes mounted before auth-required routes to prevent auth middleware from blocking public access
- All route files discovered and wired in correct order

### Phase 11: End-to-End Testing
- Created `test-e2e.ps1` — comprehensive PowerShell test script covering:
  1. User registration and login
  2. JWT token capture and authenticated requests
  3. Current user profile retrieval
  4. Workspace CRUD
  5. Sheet CRUD
  6. Column creation (TEXT, NUMBER, BOOLEAN, DATE types)
  7. Row creation with values
  8. Type validation rejection (invalid type returns 400)
  9. Row listing
  10. Form creation with public slug
  11. Public form access (no auth required)
  12. Public form submission (no auth required, creates row)
  13. Row verification after submission
  14. Authorization isolation (User B cannot access User A's resources — 403)
  15. Form toggle (deactivate → submission rejected → reactivate)
- **Result: ALL 17 E2E TESTS PASSED**

### Phase 12: Project Restructuring
- Reorganized root directory into `backend/` and `frontend/` subdirectories
- Moved all backend code, configurations, and tests into `backend/`
- Fixed Prisma paths and environment variables after move
- Regenerated Prisma client and verified E2E tests still pass

### Database Setup
- PostgreSQL database `smartsheet_demo` created
- Prisma migrations applied successfully
- All tables created: users, workspaces, sheets, columns, rows, forms

### Sprint 1 Summary

| Module | Status |
|--------|--------|
| Auth (register, login, me) | ✅ Done |
| Workspaces CRUD | ✅ Done |
| Sheets CRUD | ✅ Done |
| Columns CRUD | ✅ Done |
| Rows CRUD + type validation | ✅ Done |
| Forms CRUD + toggle | ✅ Done |
| Public form access + submission | ✅ Done |
| Ownership/authorization checks | ✅ Done |
| Error handling middleware | ✅ Done |
| E2E testing | ✅ Done — all tests passing |
| Project restructuring | ✅ Done |

---

## Sprint 2: Frontend Authentication

### Phase 1: Frontend Project Setup
- Initialized Vite React project in `frontend/` directory
- Installed dependencies: react, react-dom, react-router-dom, axios, zustand, react-hook-form, zod, @hookform/resolvers
- Installed shadcn/ui dependencies: @radix-ui/react-label, @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge, lucide-react
- Configured Vite with React plugin and `@` path alias
- Removed TypeScript template files, converted to JavaScript

### Phase 2: Styling Infrastructure
- Installed Tailwind CSS: tailwindcss, postcss, autoprefixer
- Manually configured `tailwind.config.js` and `postcss.config.js` (CLI failed to detect Vite)
- Created `src/index.css` with Tailwind directives and custom design tokens:
  - Color palette: background, foreground, primary, secondary, muted, border
  - Border radius tokens
  - Custom CSS variables for theming
- Configured dark mode support (class-based)

### Phase 3: shadcn/ui Components
- Manually created `components.json` configuration (CLI failed to detect framework)
- Implemented `src/lib/utils.js` with `cn()` utility for conditional class merging
- Created base UI components:
  - `button.jsx` — Button with variants (default, destructive, outline, secondary, ghost, link) and sizes (default, sm, lg, icon)
  - `input.jsx` — Input with label, error state, and disabled state
  - `label.jsx` — Radix UI Label wrapper
  - `card.jsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

### Phase 4: API Layer
- Created `src/lib/api.js` with Axios instance configured with:
  - Base URL from `VITE_API_URL` environment variable (default: `http://localhost:3000`)
  - Request interceptor: automatically attaches JWT from localStorage
  - Response interceptor: handles 401 errors by clearing auth state and redirecting to login
- Exported API helper functions: `login`, `register`, `getMe`, and generic `api` instance

### Phase 5: State Management (Zustand)
- Created `src/stores/auth.store.js` with Zustand store:
  - State: `user`, `isLoading`, `isAuthenticated`
  - Actions: `login(email, password)`, `register(name, email, password)`, `logout()`, `checkAuth()`
  - `checkAuth()` called on app load to restore session from JWT
  - Automatically clears localStorage on logout or 401 errors

### Phase 6: Form Validation (Zod)
- Created `src/schemas/auth.schemas.js` with Zod schemas:
  - `loginSchema` — email (valid format), password (min 6 chars)
  - `registerSchema` — name (required), email (valid format), password (min 6 chars)
- Integrated with react-hook-form via `@hookform/resolvers/zod`

### Phase 7: Routing & Protected Routes
- Created `src/components/protected-route.jsx`:
  - Wraps routes that require authentication
  - Redirects to `/login` if user is not authenticated
  - Shows loading spinner while checking auth state
- Set up React Router in `src/App.jsx`:
  - Public routes: `/login`, `/register`
  - Protected routes: `/` (dashboard), wrapped in ProtectedRoute
  - Redirects authenticated users away from login/register to dashboard

### Phase 8: Authentication Components
- Created `src/components/auth/AuthLayout.jsx`:
  - Centered layout with max-width container
  - Card wrapper with shadow and padding
  - Used for login and register pages
- Created `src/components/auth/LoginForm.jsx`:
  - react-hook-form with Zod validation
  - Email and password fields
  - Submit handler calls `authStore.login()`
  - Displays API errors (invalid credentials)
  - Loading state during submission
  - Link to register page
- Created `src/components/auth/RegisterForm.jsx`:
  - react-hook-form with Zod validation
  - Name, email, and password fields
  - Submit handler calls `authStore.register()`
  - Displays API errors (duplicate email, validation errors)
  - Loading state during submission
  - Link to login page

### Phase 9: Pages
- Created `src/pages/Login.jsx`:
  - Wraps LoginForm in AuthLayout
  - Page title: "Sign In"
  - Description text
- Created `src/pages/Register.jsx`:
  - Wraps RegisterForm in AuthLayout
  - Page title: "Create Account"
  - Description text
- Created `src/pages/Dashboard.jsx`:
  - Protected page showing user info
  - Displays logged-in user's name and email
  - Logout button calls `authStore.logout()`

### Phase 10: App Entry Point
- Created `src/main.jsx`:
  - Renders React app in StrictMode
  - Imports `index.css` for Tailwind styles
  - Mounts App component to `#root` element
- Configured `src/App.jsx`:
  - BrowserRouter wrapper
  - Routes configuration
  - Calls `authStore.checkAuth()` on mount to restore session

### Phase 11: Configuration & Documentation
- Created `frontend/.env` with `VITE_API_URL=http://localhost:3000`
- Updated `frontend/index.html`:
  - Changed title to "Smartsheet Demo"
  - Changed root div id from `app` to `root`
  - Updated script src from `main.ts` to `main.jsx`
- Updated `frontend/package.json`:
  - Removed TypeScript build step (`tsc &&`)
  - Scripts now: `dev`, `build` (vite only), `preview`
- Created `frontend/vite.config.js` with React plugin and path aliases

### Sprint 2 Summary

| Module | Status |
|--------|--------|
| Vite + React setup | ✅ Done |
| Tailwind CSS configuration | ✅ Done |
| shadcn/ui base components | ✅ Done |
| API layer (Axios) | ✅ Done |
| Auth store (Zustand) | ✅ Done |
| Form validation (Zod) | ✅ Done |
| Protected routes | ✅ Done |
| Login page + form | ✅ Done |
| Register page + form | ✅ Done |
| Dashboard page | ✅ Done |
| App routing | ✅ Done |

---

## Sprint 3: Homepage Layout & Navigation

### Phase 1: Layout Components
- Created `src/components/layout/Sidebar.jsx`:
  - Fixed-width sidebar (20% of viewport)
  - App title "Spreadsheet Demo" at top
  - Navigation buttons: Home (with home icon) and Workspaces (with briefcase icon)
  - Active state highlighting for current route
  - Uses `variant="ghost"` buttons for subtle styling
- Created `src/components/layout/Header.jsx`:
  - Horizontal header bar spanning right 80% of page
  - Bell icon for notifications
  - User profile dropdown menu with:
    - User name and email display
    - Logout option
  - Dropdown state managed with useState
- Created `src/components/layout/AppLayout.jsx`:
  - Flexbox layout wrapper combining Sidebar + Header + main content
  - Uses React Router's `<Outlet />` to render child routes
  - Proper spacing: `ml-[20%]` for sidebar offset, `pt-16` for header

### Phase 2: Route Structure Update
- Updated `src/App.jsx`:
  - Wrapped protected routes with `<AppLayout>`
  - Changed route structure to nested layout:
    - `/` → redirects to `/home`
    - `/home` → Dashboard component
    - `/workspaces` → Workspaces component (placeholder)
  - Imported and wired AppLayout component
- Simplified `src/pages/Dashboard.jsx`:
  - Removed logout button (now in header)
  - Changed welcome message to "Hi {username}! Nice to meet you"
  - Focused on single greeting display
- Created `src/pages/Workspaces.jsx`:
  - Placeholder page with title "Workspaces"
  - "Coming soon" message for future implementation

### Sprint 3 Summary

| Module | Status |
|--------|--------|
| Sidebar component | ✅ Done |
| Header component | ✅ Done |
| AppLayout wrapper | ✅ Done |
| Nested route structure | ✅ Done |
| Homepage (Dashboard) | ✅ Done |
| Workspaces placeholder | ✅ Done |
| Navigation with active states | ✅ Done |
| User profile dropdown | ✅ Done |

---

## Sprint 4: Spreadsheet View

### Phase 1: Route & Component Structure
- Added new route `/workspaces/:workspaceId/sheets/:sheetId` to `src/App.jsx`
- Route configured as standalone (outside AppLayout) for full-width spreadsheet experience
- Imported and wired SheetView component with ProtectedRoute wrapper

### Phase 2: SheetView Page Component
- Created `src/pages/SheetView.jsx`:
  - Main container for spreadsheet view
  - Fetches sheet data by ID (columns, rows) via API
  - Manages sheet state (name, columns, rows)
  - Provides context for child components
  - Loading and error state handling
  - Passes sheet data to Spreadsheet component

### Phase 3: Spreadsheet Grid Component
- Created `src/components/spreadsheet/Spreadsheet.jsx`:
  - Full-width grid layout with row numbers and column headers
  - Renders cells based on column types (TEXT, NUMBER, BOOLEAN, DATE)
  - Single-cell editing mode (click to edit, blur/Enter to save)
  - Cell validation based on column type
  - API integration for cell updates (PUT /sheets/:sheetId/rows/:rowId)
  - Add row functionality (POST /sheets/:sheetId/rows)
  - Delete row functionality (DELETE /sheets/:sheetId/rows/:rowId)
  - Horizontal and vertical scrolling
  - Row selection highlighting

### Phase 4: SheetHeader Component
- Created `src/components/spreadsheet/SheetHeader.jsx`:
  - Displays sheet name with inline editing
  - Save button for name changes (PATCH /sheets/:sheetId)
  - Cancel button to revert changes
  - Breadcrumb navigation back to workspace
  - Sheet metadata display (last updated)

### Phase 5: Toolbar Component
- Created `src/components/spreadsheet/Toolbar.jsx`:
  - Visual placeholder toolbar matching reference design
  - Buttons for: Insert Column, Insert Row, Delete Row, Format, Sort, Filter
  - All buttons are visual-only (non-functional) as per constraints
  - Tooltip hints on hover
  - Responsive layout with icon buttons

### Phase 6: AddColumnDialog Component
- Created `src/components/spreadsheet/AddColumnDialog.jsx`:
  - Modal dialog for creating new columns
  - Form fields: column name, column type (dropdown)
  - Type options: TEXT, NUMBER, BOOLEAN, DATE
  - API integration (POST /sheets/:sheetId/columns)
  - Form validation (required fields)
  - Loading state during submission
  - Error handling and display
  - Auto-close on success

### Phase 7: Sidebar Collapse Behavior
- Updated `src/components/layout/Sidebar.jsx`:
  - Added `collapsed` prop (default: false)
  - Collapsed width: 72px (vs 240px expanded)
  - Icons-only mode when collapsed (labels hidden)
  - Brand name hidden in collapsed state
  - User info hidden in collapsed state
  - Smooth width transition (200ms)
  - Centered icon alignment in collapsed mode

### Phase 8: Navigation Integration
- Updated `src/pages/Workspaces.jsx`:
  - Made sheet items clickable in tree view (sidebar)
  - Navigation to sheet view on click
  - Made sheet table rows clickable
  - Added hover states and cursor pointer
  - Maintains existing workspace navigation

### Phase 9: Build Verification
- Ran `npm run build` successfully
- No compilation errors
- All components properly imported and exported
- Route configuration validated

### Sprint 4 Summary

| Module | Status |
|--------|--------|
| SheetView page component | ✅ Done |
| Spreadsheet grid with cell editing | ✅ Done |
| SheetHeader with inline editing | ✅ Done |
| Toolbar (visual placeholder) | ✅ Done |
| AddColumnDialog component | ✅ Done |
| Sidebar collapse behavior | ✅ Done |
| Navigation from Workspaces to sheets | ✅ Done |
| API integration (columns, rows) | ✅ Done |
| Type validation on cell edit | ✅ Done |
| Build verification | ✅ Done |

### Key Decisions
- SheetView is a standalone route (not nested under AppLayout) to enable full-width layout and avoid complex layout nesting
- Toolbar buttons are visual-only placeholders matching the reference design, with no mocked functionality
- Single-cell editing model: click to edit, blur/Enter to save via API
- Sidebar collapses to 72px width with icons-only when viewing spreadsheets

---

## Documentation
- `README.md` — full API documentation with endpoints, auth instructions, project structure, testing guide
- `Progress.md` — this file, development progress log organized by sprints

