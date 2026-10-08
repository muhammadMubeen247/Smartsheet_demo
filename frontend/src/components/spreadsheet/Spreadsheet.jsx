import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, LoaderCircle, AlertCircle, X, Type, Hash, ToggleLeft, CalendarDays, Maximize2 } from 'lucide-react';
import api from '../../lib/api';
import { AddColumnDialog } from './AddColumnDialog';

const GUTTER = 84; // px, width of the row-number gutter (keep in sync with the left-[84px] classes below)

const TYPE_META = {
  TEXT: { icon: Type, label: 'Text' },
  NUMBER: { icon: Hash, label: 'Number' },
  BOOLEAN: { icon: ToggleLeft, label: 'Checkbox' },
  DATE: { icon: CalendarDays, label: 'Date' },
};

function typeMeta(type) {
  return TYPE_META[type] || { icon: Type, label: type ? type.charAt(0) + type.slice(1).toLowerCase() : 'Text' };
}

const DEFAULT_COL_WIDTH = 180;

export function Spreadsheet({ sheetId, columns: initialColumns = [], rows: initialRows = [], user, onRename }) {
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState('');
  const [selectedCell, setSelectedCell] = useState(null); // { rowId, columnId }
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnId }
  const [editValue, setEditValue] = useState('');
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newRowValues, setNewRowValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cellErrors, setCellErrors] = useState({});
  const [columnWidths, setColumnWidths] = useState(() => new Map());

  const inputRef = useRef(null);
  const gridRef = useRef(null);
  const doneRef = useRef(false); // prevents Enter/Escape + blur from double-committing
  const resizeRef = useRef({ columnId: null, startX: 0, startWidth: 0 });

  const colTypes = useRef(new Map(columns.map((c) => [String(c.id), c.type])));
  const colNames = useRef(new Map(columns.map((c) => [String(c.id), c.name])));

  useEffect(() => {
    colTypes.current = new Map(columns.map((c) => [String(c.id), c.type]));
    colNames.current = new Map(columns.map((c) => [String(c.id), c.name]));
  }, [columns]);

  useEffect(() => {
    if (editingCell) inputRef.current?.focus();
  }, [editingCell]);

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
    const newWidth = Math.max(120, startWidth + diff);

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

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  const getColWidth = (colId) => columnWidths.get(String(colId)) ?? DEFAULT_COL_WIDTH;

  const flashError = (key, msg, ms = 3000) => {
    setCellErrors((prev) => ({ ...prev, [key]: msg }));
    setTimeout(() => setCellErrors((prev) => { const n = { ...prev }; delete n[key]; return n; }), ms);
  };

  /* ───────────── API actions ───────────── */

  const addRow = useCallback(async (values) => {
    setIsSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/sheets/${sheetId}/rows`, { values });
      setRows((prev) => [...prev, data.data]);
      setNewRowValues({});
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to add row';
      setError(msg);
      flashError('new', msg, 5000);
    } finally {
      setIsSubmitting(false);
    }
  }, [sheetId]);

  const updateRow = useCallback(async (rowId, values) => {
    setIsSubmitting(true);
    setError('');
    try {
      const { data } = await api.put(`/sheets/${sheetId}/rows/${rowId}`, { values });
      setRows((prev) => prev.map((r) => (r.id === rowId ? data.data : r)));
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update row';
      setError(msg);
      flashError(`row-${rowId}`, msg, 5000);
    } finally {
      setIsSubmitting(false);
    }
  }, [sheetId]);

  const deleteRow = useCallback(async (rowId) => {
    try {
      await api.delete(`/sheets/${sheetId}/rows/${rowId}`);
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      setSelectedCell((s) => (s?.rowId === rowId ? null : s));
    } catch {
      setError('Failed to delete row');
    }
  }, [sheetId]);

  const addColumn = useCallback(async (payload) => {
    try {
      const { data } = await api.post(`/sheets/${sheetId}/columns`, payload);
      setColumns((prev) => {
        const updated = [...prev, data.data].sort((a, b) => a.position - b.position);
        colTypes.current.set(String(data.data.id), data.data.type);
        colNames.current.set(String(data.data.id), data.data.name);
        return updated;
      });
      setIsAddColumnOpen(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add column');
    }
  }, [sheetId]);

  const deleteColumn = useCallback(async (columnId) => {
    try {
      await api.delete(`/sheets/${sheetId}/columns/${columnId}`);
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setSelectedCell((s) => (s?.columnId === columnId ? null : s));
    } catch {
      setError('Failed to delete column');
    }
  }, [sheetId]);

  /* ───────────── Editing ───────────── */

  const startEdit = (rowId, columnId, seed) => {
    const row = rows.find((r) => r.id === rowId);
    const currentVal = row?.values?.[String(columnId)];
    doneRef.current = false;
    setSelectedCell({ rowId, columnId });
    setEditingCell({ rowId, columnId });
    setEditValue(seed !== undefined ? seed : currentVal != null ? String(currentVal) : '');
  };

  const commitEdit = async () => {
    if (!editingCell || doneRef.current) return;
    const { rowId, columnId } = editingCell;
    const row = rows.find((r) => r.id === rowId);
    if (!row) { setEditingCell(null); return; }

    const type = colTypes.current.get(String(columnId));
    const errKey = `${rowId}-${columnId}`;
    let parsedValue = editValue;

    if (type === 'NUMBER') {
      const num = parseFloat(editValue);
      if (editValue.trim() !== '' && isNaN(num)) {
        flashError(errKey, 'Enter a valid number');
        return;
      }
      parsedValue = editValue.trim() === '' ? '' : num;
    } else if (type === 'BOOLEAN') {
      const lower = editValue.trim().toLowerCase();
      if (lower === 'true' || lower === 'false') {
        parsedValue = lower === 'true';
      } else {
        flashError(errKey, 'Use true or false');
        return;
      }
    }

    const newValues = { ...row.values };
    if (parsedValue === '' || parsedValue === null || parsedValue === undefined) {
      delete newValues[String(columnId)];
    } else {
      newValues[String(columnId)] = parsedValue;
    }

    doneRef.current = true;
    setEditingCell(null);
    setEditValue('');
    gridRef.current?.focus();
    await updateRow(rowId, newValues);
  };

  const cancelEdit = () => {
    doneRef.current = true;
    setEditingCell(null);
    setEditValue('');
    gridRef.current?.focus();
  };

  const clearCell = (rowId, columnId) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const newValues = { ...row.values };
    delete newValues[String(columnId)];
    updateRow(rowId, newValues);
  };

  /* ───────────── Keyboard navigation ───────────── */

  const handleGridKeyDown = (e) => {
    if (editingCell || !selectedCell) return;
    if (e.target.tagName === 'INPUT') return; // new-row inputs handle their own keys

    const ri = rows.findIndex((r) => r.id === selectedCell.rowId);
    const ci = columns.findIndex((c) => c.id === selectedCell.columnId);
    if (ri < 0 || ci < 0) return;

    const move = (dr, dc) => {
      const nr = Math.min(Math.max(ri + dr, 0), rows.length - 1);
      const nc = Math.min(Math.max(ci + dc, 0), columns.length - 1);
      setSelectedCell({ rowId: rows[nr].id, columnId: columns[nc].id });
    };

    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); move(-1, 0); break;
      case 'ArrowDown': e.preventDefault(); move(1, 0); break;
      case 'ArrowLeft': e.preventDefault(); move(0, -1); break;
      case 'ArrowRight': e.preventDefault(); move(0, 1); break;
      case 'Tab': e.preventDefault(); move(0, e.shiftKey ? -1 : 1); break;
      case 'Enter':
      case 'F2': e.preventDefault(); startEdit(selectedCell.rowId, selectedCell.columnId); break;
      case 'Escape': setSelectedCell(null); break;
      case 'Delete':
      case 'Backspace': e.preventDefault(); clearCell(selectedCell.rowId, selectedCell.columnId); break;
      default:
        // typing a character starts editing and replaces the content
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          startEdit(selectedCell.rowId, selectedCell.columnId, e.key);
        }
    }
  };

  /* ───────────── New row ───────────── */

  const handleNewRowValue = (columnId, value) => {
    setNewRowValues((prev) => ({ ...prev, [String(columnId)]: value }));
  };

  const commitNewRow = () => {
    const values = {};
    let hasData = false;
    columns.forEach((col) => {
      const v = newRowValues[String(col.id)];
      if (v != null && v.trim() !== '') {
        values[String(col.id)] = col.type === 'NUMBER' ? parseFloat(v) : col.type === 'BOOLEAN' ? v.toLowerCase() === 'true' : v;
        hasData = true;
      }
    });
    if (hasData) addRow(values);
  };

  const newRowEmpty = Object.values(newRowValues).every((v) => !v || !v.trim());

  /* ───────────── Cell rendering ───────────── */

  const renderCell = (row, column, colIdx) => {
    const key = `${row.id}-${column.id}`;
    const errMsg = cellErrors[key] || cellErrors[`row-${row.id}`];
    const rawValue = row.values?.[String(column.id)];
    const isSelected = selectedCell?.rowId === row.id && selectedCell?.columnId === column.id;
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
    const isPrimary = colIdx === 0;

    const tdClasses = [
      'relative h-9 min-w-[120px] border-b border-r border-zinc-200/80 p-0 text-sm text-zinc-800',
      errMsg ? 'bg-red-50' : 'bg-white group-hover:bg-zinc-50',
      isPrimary ? 'sticky left-[84px] z-10' : '',
    ].join(' ');
    const cellStyle = { width: getColWidth(column.id) };

    const selectedOverlay = (
      <>
        <div className="pointer-events-none absolute inset-0 z-10 border-2 border-red-500" />
        {!isEditing && (
          <>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => startEdit(row.id, column.id)}
              className="absolute right-1.5 top-1/2 z-20 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800"
              title="Edit cell"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <div className="pointer-events-none absolute -bottom-[4px] -right-[4px] z-20 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </>
        )}
      </>
    );

    if (isEditing) {
      return (
        <td key={key} className={tdClasses} style={cellStyle} title={errMsg || undefined}>
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
              if (e.key === 'Tab') { e.preventDefault(); commitEdit(); }
            }}
            className={`h-full w-full bg-white px-3 text-sm outline-none ${column.type === 'NUMBER' ? 'text-right tabular-nums' : ''}`}
            placeholder={column.type === 'BOOLEAN' ? 'true / false' : column.type === 'NUMBER' ? '0' : ''}
          />
          {selectedOverlay}
        </td>
      );
    }

    let content;
    if (column.type === 'BOOLEAN' && rawValue != null) {
      content = (
        <span className={`inline-flex items-center gap-1.5 ${rawValue ? 'text-emerald-700' : 'text-zinc-500'}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${rawValue ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
          {String(rawValue)}
        </span>
      );
    } else if (rawValue != null && String(rawValue) !== '') {
      content = <span className="truncate">{String(rawValue)}</span>;
    } else {
      content = null;
    }

    return (
      <td
        key={key}
        className={tdClasses}
        style={cellStyle}
        title={errMsg || undefined}
        onClick={() => { setSelectedCell({ rowId: row.id, columnId: column.id }); gridRef.current?.focus(); }}
        onDoubleClick={() => startEdit(row.id, column.id)}
      >
        {/* When selected, reserve room on the right (pr-9) so the expand button never covers the value */}
        <div
          className={`flex h-full items-center pl-3 ${isSelected ? 'pr-9' : 'pr-3'} ${
            column.type === 'NUMBER' ? 'justify-end tabular-nums' : ''
          }`}
        >
          {content}
        </div>
        {isSelected && selectedOverlay}
      </td>
    );
  };

  /* ───────────── Empty state ───────────── */

  if (columns.length === 0 && rows.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 px-8 py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /></svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-900">No columns yet</h3>
        <p className="max-w-sm text-center text-sm text-zinc-500">Add your first column to start building your spreadsheet.</p>
        <button
          onClick={() => setIsAddColumnOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          Add column
        </button>
        {isAddColumnOpen && (
          <AddColumnDialog onAdd={addColumn} onClose={() => setIsAddColumnOpen(false)} nextPosition={0} />
        )}
      </div>
    );
  }

  /* ───────────── Grid ───────────── */

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.03]">
      {error && (
        <div className="m-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="rounded p-0.5 hover:bg-red-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        className="max-h-[70vh] overflow-auto outline-none"
      >
        <table className="w-full min-w-[640px] border-separate border-spacing-0">
          <thead>
            <tr>
              {/* Gutter header */}
              <th
                style={{ width: GUTTER, minWidth: GUTTER }}
                className="sticky left-0 top-0 z-30 h-[68px] border-b border-r border-zinc-200/80 bg-white px-3 text-left align-bottom"
              >
                <span className="mb-3 block text-xs font-medium text-zinc-400">
                  {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                </span>
              </th>

              {columns.map((col, i) => {
                const { icon: TypeIcon, label } = typeMeta(col.type);
                const width = getColWidth(col.id);
                return (
                  <th
                    key={col.id}
                    style={{ width, minWidth: 120 }}
                    className={`group sticky top-0 h-[68px] border-b border-r border-zinc-200/80 bg-white px-3 text-left align-middle ${
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
                    <div
                      onMouseDown={(e) => handleResizeStart(col.id, e)}
                      className="absolute inset-y-0 right-0 z-30 w-1 cursor-col-resize hover:bg-red-500 active:bg-red-500"
                      aria-label={`Resize ${col.name} column`}
                    />
                  </th>
                );
              })}

              {/* Add column */}
              <th className="sticky top-0 z-20 h-[68px] w-[56px] min-w-[56px] border-b border-zinc-200/80 bg-white">
                <button
                  onClick={() => setIsAddColumnOpen(true)}
                  className="flex h-full w-full items-center justify-center text-zinc-400 transition hover:bg-zinc-50 hover:text-red-600"
                  title="Add column"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const rowSelected = selectedCell?.rowId === row.id;
              return (
                <tr key={row.id} className="group">
                  <td
                    style={{ width: GUTTER, minWidth: GUTTER }}
                    className={`sticky left-0 z-20 h-9 border-b border-r border-zinc-200/80 px-3 ${
                      rowSelected ? 'bg-zinc-100' : 'bg-white group-hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold tabular-nums ${rowSelected ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        title="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  {columns.map((col, ci) => renderCell(row, col, ci))}
                  <td className="h-9 border-b border-zinc-200/80 bg-white group-hover:bg-zinc-50" />
                </tr>
              );
            })}

            {/* Add row */}
            <tr className="group">
              <td
                style={{ width: GUTTER, minWidth: GUTTER }}
                className="sticky left-0 z-20 h-9 border-b border-r border-zinc-200/80 bg-white px-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tabular-nums text-zinc-300">{rows.length + 1}</span>
                  <button
                    onClick={commitNewRow}
                    disabled={isSubmitting || newRowEmpty}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                    title="Add row"
                  >
                    {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>
                </div>
              </td>
              {columns.map((col, ci) => (
                <td
                  key={`new-${col.id}`}
                  style={{ width: getColWidth(col.id), minWidth: 120 }}
                  className={`h-9 border-b border-r border-zinc-200/80 bg-white p-0 focus-within:bg-white ${ci === 0 ? 'sticky left-[84px] z-10' : ''} ${cellErrors.new ? 'bg-red-50' : ''}`}
                >
                  <input
                    value={newRowValues[String(col.id)] || ''}
                    onChange={(e) => handleNewRowValue(col.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitNewRow(); }}
                    placeholder={ci === 0 ? 'Add a row…' : col.type === 'BOOLEAN' ? 'true / false' : col.type === 'NUMBER' ? '0' : ''}
                    className={`h-full w-full bg-transparent px-3 text-sm outline-none placeholder:text-zinc-300 focus:ring-2 focus:ring-inset focus:ring-red-500 ${col.type === 'NUMBER' ? 'text-right tabular-nums' : ''}`}
                  />
                </td>
              ))}
              <td className="h-9 border-b border-zinc-200/80 bg-white" />
            </tr>
          </tbody>
        </table>
      </div>

      {isAddColumnOpen && (
        <AddColumnDialog
          onAdd={addColumn}
          onClose={() => setIsAddColumnOpen(false)}
          nextPosition={columns.length > 0 ? Math.max(...columns.map((c) => c.position)) + 1 : 0}
        />
      )}
    </div>
  );
}