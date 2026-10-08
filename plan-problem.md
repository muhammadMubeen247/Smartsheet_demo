## Problem

The horizontal scrollbar never appears when columns exceed the viewport width.

## Root Cause

The `<table>` in `Spreadsheet.jsx` (line 466) uses the default **`table-layout: auto`**. Under auto layout the browser is free to **compress column widths below their inline `style.width`** (and even below `min-w-[120px]` on `<td>`) to fit the table within the container. So even with 6 columns at 180px each (1164px total), the browser shrinks the columns to fit the inner `overflow-auto` div — the table never actually overflows, and the scrollbar never appears.

## Fix

Add `table-fixed` to the `<table>` class list. With `table-layout: fixed`, the browser uses the widths specified on the **first row** verbatim and never compresses them. This lets the table grow to its natural width, triggers overflow on the parent `overflow-auto` div, and produces a horizontal scrollbar.

### File to change

**`frontend/src/components/spreadsheet/Spreadsheet.jsx`** — line 466

```diff
- <table className="min-w-[640px] border-separate border-spacing-0">
+ <table className="min-w-[640px] table-fixed border-separate border-spacing-0">
```

No other files need changes. The existing layout chain is correct:
- **Line 449:** Outer wrapper with `overflow-hidden` (for rounded corners) — fine.
- **Line 460–465:** Inner `div` with `overflow-auto max-h-[70vh]` — this is the scroll container and it already supports horizontal scroll.
- Sticky columns (gutter, primary column) already have correct `left` offsets and `z-index` values that will continue to work correctly with `table-fixed`.

## Verification

1. `cd C:\Techtimize\frontend && npm run build` — confirm it compiles.
2. Open a sheet with 6+ columns in the browser.
3. Confirm: columns retain their 180px width, a horizontal scrollbar appears when columns exceed the viewport, and the gutter/primary column remain sticky while scrolling horizontally.