# Sprint 4: Spreadsheet View — Implementation Plan

## Context

- **Backend**: Fully functional API with sheets, columns, rows (CRUD), type validation (TEXT/NUMBER/BOOLEAN/DATE), ownership checks
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui + Zustand, existing auth flow, Workspaces page with sheet creation
- **Reference image**: Collapsed sidebar, sheet toolbar, spreadsheet grid with row numbers, column headers, editable cells
- **Constraint**: No new backend features. Only UI for what backend already supports. No formatting, formulas, sorting, or filtering.

---

## Files to Create (5 new files)

### 1. `frontend/src/pages/SheetView.jsx`
**Purpose**: Main page component for the spreadsheet view, replaces Dashboard as the inner route for `/workspaces/:workspaceId/sheets/:sheetId`.

**Responsibilities**:
- Read `workspaceId` and `sheetId` from route params
- Fetch sheet details (`GET /sheets/:id` — returns sheet with embedded columns)
- Fetch rows (`GET /:sheetId/rows`)
- Display loading, error, and empty states
- Pass `sheet`, `columns`, `rows` data to `Spreadsheet` component
- Provide callbacks: `onColumnCreated`, `onRowCreated`, `onCellUpdated`, `onRowDeleted`
- Show sheet name in header via `useEffect` (updates Header title dynamically)

**Data flow**:
```
GET /sheets/:sheetId → { data: { id, name, workspaceId, columns: [...] } }
GET /:sheetId/rows   → { data: [{ id, values: { "1": "abc", "2": 42 } }] }
```

### 2. `frontend/src/components/spreadsheet/Spreadsheet.jsx`
**Purpose**: The grid/table component — renders columns and rows, handles cell editing.

**Structure**:
- `<table>` element for the grid (semantic, accessible, easy to style)
- **Column header row**: column names + a `+ Column` button (triggers add-column modal)
- **Data rows**: each row has a row-number cell (1, 2, 3...) + one cell per column
- **Add row row**: a final `+ Add row` button below all data rows
- **Row number column**: fixed width, non-editable, grey text

**Cell rendering logic**:
```jsx
switch (column.type) {
  case 'TEXT':     → text input (value || '')
  case 'NUMBER':   → text input with number parsing on save
  case 'BOOLEAN':  → checkbox or "true/false" text
  case 'DATE':     → text input with date hint
}
```

**Cell editing model**:
- Click a cell → it becomes an `<input>` with the current value
- On blur or Enter key → send `PUT /:sheetId/rows/:rowId` with the **full** `values` object (backend does full replace)
- Track editing state: `{ rowId, columnId }` — only one cell editable at a time
- Empty new-row inputs: on Enter or blur with a non-empty value → `POST /:sheetId/rows` with `{ values: { [columnId]: value } }`

**Column add flow**:
- `+ Column` button → opens a small modal/inline form with `name`, `type` dropdown, and `position` (auto-appends if omitted)
- Calls `POST /:sheetId/columns`

### 3. `frontend/src/components/spreadsheet/SheetHeader.jsx`
**Purpose**: Sheet title bar with metadata and action buttons.

**Layout** (matching reference image):
- Left: spreadsheet icon, sheet name (editable via inline rename → `PUT /sheets/:id`)
- Center: minimal toolbar (Table view indicator, Format button — visually present but non-functional since backend doesn't support formatting)
- Right: Share button (styled, no action — future), user avatar

**Props**: `sheet`, `onRename(name)`, `workspaceId`

### 4. `frontend/src/components/spreadsheet/Toolbar.jsx`
**Purpose**: Visual toolbar row below the header (matching reference image's formatting toolbar).

**Layout**:
- Row of icon buttons: Table, Filter, Sort, Format, Format rules, font controls, alignment
- All buttons styled per reference image but **non-functional** (placeholder — backend has no formatting/sorting API)
- Each button has a `title` attribute explaining "Not yet supported"
- Visual fidelity only — no behavior

**Justification**: The reference image shows these controls prominently. We include them for visual accuracy per the design reference, but they don't do anything since the backend doesn't support these features. This follows the rule: "Use the reference image as the source of truth for visual design."

### 5. `frontend/src/components/spreadsheet/AddColumnDialog.jsx`
**Purpose**: Modal/dialog for adding a new column.

**Fields**:
- Column name (required text input)
- Column type dropdown (TEXT, NUMBER, BOOLEAN, DATE)
- Position (optional number input — defaults to auto-append)
- Create button

---

## Files to Modify (4 existing files)

### 1. `frontend/src/components/layout/Sidebar.jsx`
**Change**: Accept a `collapsed` prop.

**Logic**:
```jsx
export function Sidebar({ collapsed = false }) {
  // When collapsed:
  //   - width class changes from w-[240px] to w-[72px]
  //   - Hide brand text, nav labels, user name/email
  //   - Center icons
  //   - Already partially supported by existing CSS (.app-sidebar, sidebar-label, sidebar-user)
}
```

The existing `index.css` already has media query rules for collapsed sidebar at `@media (max-width: 1023px)`. We'll reuse those class names (`sidebar-brand`, `sidebar-label`, `sidebar-user`) by applying them conditionally via the `collapsed` prop.

### 2. `frontend/src/components/layout/AppLayout.jsx`
**Change**: Accept children and detect if current route is a spreadsheet view.

**Logic**:
- Use `useLocation()` to check if path matches `/workspaces/:workspaceId/sheets/:sheetId`
- Pass `collapsed` to Sidebar when on spreadsheet route
- When not collapsed: render Sidebar + Header + Outlet (existing behavior)
- When collapsed: render compact Sidebar + Outlet (Header is replaced by SheetHeader inside the page)

**Alternative (simpler)**: Don't modify AppLayout. Instead, `SheetView` will render its own layout that includes a collapsed sidebar and sheet-specific header, and the AppLayout's Outlet will render `SheetView` which handles its own inner layout.

**Decision**: Use the simpler approach — `AppLayout` stays unchanged. `SheetView` renders a full-page layout with its own sidebar + header + grid. This avoids deeply nested layout complexity.

### 3. `frontend/src/App.jsx`
**Change**: Add the sheet route.

```jsx
import { SheetView } from './pages/SheetView';
// ...

// Inside the AppLayout nested routes:
<Route path="workspaces/:workspaceId/sheets/:sheetId" element={<SheetView />} />
```

### 4. `frontend/src/components/layout/Header.jsx`
**Change**: Accept a `title` and `description` prop to override the automatic values, OR detect the sheet route and show "Spreadsheet" as the title.

**Change**:
```jsx
const isSpreadsheet = location.pathname.match(/\/workspaces\/\d+\/sheets\/\d+/);
const title = isSpreadsheet ? 'Spreadsheet' : (isWorkspaces ? 'Workspaces' : 'Home');
```

Actually — the cleaner approach: `SheetView` manages its own header bar (SheetHeader component), so the global Header is hidden on the spreadsheet route. We can handle this with a CSS class or a context flag.

**Simpler approach**: Add a `showGlobalHeader` prop to AppLayout, default true. SheetView renders without the global header and uses its own SheetHeader instead.

---

## Route Structure

```
/                              → redirect /home
/login                         → public
/register                      → public
/workspaces                    → Workspaces (existing)
/workspaces/:workspaceId       → Workspaces (existing, with detail)
/workspaces/:workspaceId/sheets/:sheetId  → SheetView (NEW)
```

---

## Data Flow Sequence

1. User clicks a sheet in the Workspaces page (from the sheets table)
2. Navigate to `/workspaces/:workspaceId/sheets/:sheetId`
3. `SheetView` mounts:
   - `GET /sheets/:sheetId` → gets sheet + columns
   - `GET /:sheetId/rows` → gets all rows
4. Renders `Spreadsheet` grid
5. User edits a cell → `PUT /:sheetId/rows/:rowId` with full values object
6. User adds a row → `POST /:sheetId/rows`
7. User adds a column → `POST /:sheetId/columns`
8. User renames sheet → `PUT /sheets/:id`

---

## Visual Design (per reference image)

| Element | Implementation |
|---------|---------------|
| Sidebar | 72px collapsed, icons only, red accent |
| Sheet header | Sheet icon + name + share button |
| Toolbar | Icon buttons row (non-functional placeholders) |
| Grid header | Column names + `+ Column` |
| Grid body | Row numbers (grey, fixed width) + editable cells |
| Cell editing | Click → `<input>`, blur/Enter → save via API |
| Boolean cells | Checkbox or text toggle |
| Add row | `+` button below last row |
| Empty state | "No columns yet" with `+ Add column` prompt |

---

## Verification Steps

1. **Load a sheet**: Navigate to `/workspaces/:id/sheets/:id` → grid shows columns and rows
2. **Edit a cell**: Click cell, type, press Enter → value updates, PUT request sent
3. **Add a column**: Click `+ Column`, fill form → new column appears
4. **Add a row**: Fill the add-row inputs → new row created
5. **Rename sheet**: Edit sheet name → PUT request, name updates
6. **Empty sheet**: Open sheet with no columns → shows "Add your first column" state
7. **Type validation**: Enter invalid type (e.g., text in NUMBER column) → API returns 400, error shown to user
8. **Sidebar**: Confirmed collapsed (72px) on spreadsheet route

---

## Out of Scope (backend doesn't support)

- Text formatting (bold, italic, font, color) — no backend API
- Formulas — no backend support
- Sorting/filtering — no backend API
- Charts — no backend support
- Bulk row operations — no backend endpoint
- Column reordering beyond position field — no dedicated reorder endpoint
- Sharing — no backend support
- Version history — no backend support