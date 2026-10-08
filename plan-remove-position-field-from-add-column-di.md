# Remove Position Field from Add-Column Dialog

## Goal
Remove the user-facing `Position` input from the AddColumnDialog and make the backend authoritative for position calculation.
- **Append (normal add):** always placed at `max(position) + 1`
- **Insert left/right:** already correctly shifts positions and computes the target slot — no changes needed there.

---

## Changes

### 1. `frontend/src/components/spreadsheet/AddColumnDialog.jsx`
Remove the position field entirely.

**Signature (line 4)** — drop `nextPosition`:
```jsx
// before
export function AddColumnDialog({ mode = 'create', direction, referenceColumnId, onAdd, onInsert, onClose, nextPosition })
// after
export function AddColumnDialog({ mode = 'create', direction, referenceColumnId, onAdd, onInsert, onClose })
```

**State (line 7)** — drop `position` state:
```jsx
// delete
const [position, setPosition] = useState(String(nextPosition));
```

**Submit handler (lines 24–28)** — stop sending `position`:
```jsx
// before
const payload = { name: colName, type, position: parseInt(position, 10) || undefined };
// after
const payload = { name: colName, type };
```

**JSX (lines 94–110)** — remove the entire `{!isInsertMode && (...)}` block that renders the Position label, input, and helper text. Leave the type `<select>` directly followed by the button row.

---

### 2. `frontend/src/components/spreadsheet/Spreadsheet.jsx`
Drop the now-unused `nextPosition` prop from both `<AddColumnDialog>` usages.

**Empty-state dialog (line 439–441):**
```jsx
<AddColumnDialog onAdd={addColumn} onClose={() => setIsAddColumnOpen(false)} />
```

**Main dialog (lines 608–613):**
```jsx
<AddColumnDialog
  onAdd={addColumn}
  onClose={() => setIsAddColumnOpen(false)}
/>
```

**Insert dialog (lines 617–624):**
```jsx
<AddColumnDialog
  mode="insert"
  direction={pendingInsert.direction}
  referenceColumnId={pendingInsert.referenceColumnId}
  onInsert={insertColumn}
  onClose={() => setPendingInsert(null)}
/>
```

---

### 3. `backend/src/modules/columns/columns.service.js`
Make `create()` ignore any `position` in the request and always auto-calculate — this is the real fix for the Prisma constraint errors the user reported.

**Line 6:** drop `position` from the destructured param (or keep it and ignore it).

**Lines 13–19:** replace the conditional with a plain auto-calculation:
```js
const maxPosition = await prisma.column.aggregate({
  where: { sheetId: sheetIdInt },
  _max: { position: true },
});
position = (maxPosition._max.position ?? -1) + 1;
```

The existing `insert()` function (lines 89–139) already:
- computes `insertPosition` as `target.position` (left) or `target.position + 1` (right)
- shifts subsequent columns using the two-step TEMP_OFFSET approach
- creates the new column at the computed position

No changes needed there.

---

### 4. (No change required) `backend/src/modules/columns/columns.controller.js`
It already reads `{ name, type, position }` from `req.body`; passing `position: undefined` works fine with the updated service. Left as-is to keep the diff small.

---

## Verification
1. `cd frontend && npm run build` → exit 0, no errors.
2. Start both servers, create a new sheet (auto-initializes 6 cols + 50 rows).
3. **Add column** via the `+` button → verify it lands at position 6 (end), no Prisma errors in backend logs.
4. **Insert left** via the 3-dots menu on "Column 2", enter a name/type → verify new column appears at position 1, "Column 2" shifts to 2, no `P2002` errors.
5. **Insert right** via the 3-dots menu on "Column 4" → verify new column appears at position 5, subsequent columns shift, no errors.
6. Reopen the Add Column dialog and confirm the Position field is no longer present.