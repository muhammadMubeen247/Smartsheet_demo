# Column Resize Feature Implementation Plan

## Overview
Add draggable column resizing to the Spreadsheet component with proper cursor feedback and visual handles.

## Files to Change
- `frontend/src/components/spreadsheet/Spreadsheet.jsx`

## Detailed Changes

### 1. Add State and Refs (after line 29)

**Add column width state:**
```javascript
const [columnWidths, setColumnWidths] = useState(() => new Map());
```

**Add resize tracking ref:**
```javascript
const resizeRef = useRef({ columnId: null, startX: 0, startWidth: 0 });
```

### 2. Add Resize Handlers (after line 45, before `flashError`)

**Add mouse event handlers:**
```javascript
const handleResizeStart = (columnId, e) => {
  e.preventDefault();
  e.stopPropagation();
  
  const th = e.currentTarget.closest('th');
  const startWidth = th.offsetWidth;
  
  resizeRef.current = {
    columnId,
    startX: e.clientX,
    startWidth,
  };
  
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const handleResizeMove = (e) => {
  const { columnId, startX, startWidth } = resizeRef.current;
  const diff = e.clientX - startX;
  const newWidth = Math.max(120, startWidth + diff); // min 120px
  
  setColumnWidths((prev) => {
    const next = new Map(prev);
    next.set(String(columnId), newWidth);
    return next;
  });
};

const handleResizeEnd = () => {
  resizeRef.current = { columnId: null, startX: 0, startWidth: 0 };
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};
```

### 3. Update `useEffect` Cleanup (around line 38-45)

**Add cleanup for resize listeners:**
```javascript
useEffect(() => {
  return () => {
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };
}, []);
```

### 4. Helper Function to Get Column Width (after `typeMeta` function, before `useEffect`)

```javascript
const getColWidth = (columnId) => columnWidths.get(String(columnId)) || 180;
```

### 5. Update Column Header Rendering (lines 388-415)

**Replace the entire `columns.map` section in thead with:**
```javascript
{columns.map((col, i) => {
  const { icon: TypeIcon, label } = typeMeta(col.type);
  const width = getColWidth(col.id);
  return (
    <th
      key={col.id}
      style={{ width, minWidth: 120 }}
      className={`group relative sticky top-0 h-[68px] border-b border-r border-zinc-200/80 bg-white px-3 text-left align-middle ${
        i === 0 ? 'left-[84px] z-30' : 'z-20'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900">{col.name}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-normal text-zinc-400">
            <TypeIcon className="h-3.5 w-3.5" />
            <span>{i === 0 ? `${label} · Primary` : label}</span>
          </div>
        </div>
        <button
          onClick={() => deleteColumn(col.id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          title={`Delete ${col.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Resize handle */}
      <div
        onMouseDown={(e) => handleResizeStart(col.id, e)}
        className="absolute inset-y-0 right-0 z-30 w-1 cursor-col-resize hover:bg-red-500 active:bg-red-500"
        aria-label={`Resize ${col.name} column`}
      />
    </th>
  );
})}
```

### 6. Update Data Cell Rendering (line 254-258)

**Update `tdClasses` to include inline width style:**
```javascript
const tdClasses = [
  'relative h-9 border-b border-r border-zinc-200/80 p-0 text-sm text-zinc-800',
  errMsg ? 'bg-red-50' : 'bg-white group-hover:bg-zinc-50',
  isPrimary ? 'sticky left-[84px] z-10' : '',
].join(' ');

const cellStyle = { width: getColWidth(column.id), minWidth: 120 };
```

**Update the editing cell `<td>` (line 282):**
```javascript
<td key={key} className={tdClasses} style={cellStyle} title={errMsg || undefined}>
```

**Update the display cell `<td>` (line 316-322):**
```javascript
<td
  key={key}
  className={tdClasses}
  style={cellStyle}
  title={errMsg || undefined}
  onClick={() => { setSelectedCell({ rowId: row.id, columnId: column.id }); gridRef.current?.focus(); }}
  onDoubleClick={() => startEdit(row.id, column.id)}
>
```

### 7. Update New Row Cell Rendering (lines 478-491)

**Update the new row cell `<td>` (line 479-482):**
```javascript
<td
  key={`new-${col.id}`}
  style={{ width: getColWidth(col.id), minWidth: 120 }}
  className={`h-9 border-b border-r border-zinc-200/80 bg-white p-0 focus-within:bg-white ${ci === 0 ? 'sticky left-[84px] z-10' : ''} ${cellErrors.new ? 'bg-red-50' : ''}`}
>
```

## Key Implementation Details

1. **Cursor Feedback**: The resize handle div shows `cursor-col-resize` on hover, and during drag the entire body gets `cursor: col-resize` to prevent cursor flicker.

2. **Minimum Width**: Columns have a minimum width of 120px enforced in `handleResizeMove`.

3. **State Management**: Column widths stored in a Map keyed by column ID, allowing independent resizing without affecting other columns.

4. **Drag Prevention**: `e.stopPropagation()` in `handleResizeStart` prevents drag from triggering cell selection.

5. **Cleanup**: Event listeners removed on component unmount to prevent memory leaks.

6. **Visual Handle**: Thin 4px-wide handle on the right edge of each column header, turns red on hover/active state.

## Verification Steps

1. Run `npm run build` in the frontend directory to ensure no compilation errors
2. Start the dev server with `npm run dev`
3. Navigate to a sheet with columns
4. Hover over the right edge of any column header - cursor should change to `col-resize`
5. Click and drag to resize - column should resize in real-time
6. Release mouse - new width should persist
7. Verify minimum width constraint (can't resize below 120px)
8. Test that resizing doesn't interfere with cell selection or editing
9. Verify resize handle visual feedback (red on hover/active)