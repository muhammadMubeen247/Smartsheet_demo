import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, LoaderCircle, AlertCircle, X } from 'lucide-react';
import api from '../../lib/api';
import { AddColumnDialog } from './AddColumnDialog';

function getInitials(name) {
  return (name || 'U').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export function Spreadsheet({ sheetId, columns: initialColumns = [], rows: initialRows = [], user, onRename }) {
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnId }
  const [editValue, setEditValue] = useState('');
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowValues, setNewRowValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cellErrors, setCellErrors] = useState({});
  const inputRef = useRef(null);

  const colTypes = useRef(new Map(columns.map((c) => [String(c.id), c.type])));
  const colNames = useRef(new Map(columns.map((c) => [String(c.id), c.name])));

  useEffect(() => {
    colTypes.current = new Map(columns.map((c) => [String(c.id), c.type]));
    colNames.current = new Map(columns.map((c) => [String(c.id), c.name]));
  }, [columns]);

  const addRow = useCallback(async (values) => {
    setIsSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/sheets/${sheetId}/rows`, { values });
      setRows((prev) => [...prev, data.data]);
      setNewRowValues({});
      setIsAddingRow(false);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to add row';
      setError(msg);
      setCellErrors((prev) => ({ ...prev, new: msg }));
      setTimeout(() => setCellErrors((prev) => { const n = { ...prev }; delete n.new; return n; }), 5000);
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
      const key = `row-${rowId}`;
      setCellErrors((prev) => ({ ...prev, [key]: msg }));
      setTimeout(() => setCellErrors((prev) => { const n = { ...prev }; delete n[key]; return n; }), 5000);
    } finally {
      setIsSubmitting(false);
    }
  }, [sheetId]);

  const deleteRow = useCallback(async (rowId) => {
    try {
      await api.delete(`/sheets/${sheetId}/rows/${rowId}`);
      setRows((prev) => prev.filter((r) => r.id !== rowId));
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
    } catch {
      setError('Failed to delete column');
    }
  }, [sheetId]);

  const startEdit = (rowId, columnId) => {
    const row = rows.find((r) => r.id === rowId);
    const currentVal = row?.values?.[String(columnId)];
    setEditingCell({ rowId, columnId });
    setEditValue(currentVal != null ? String(currentVal) : '');
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const commitEdit = async () => {
    if (!editingCell) return;
    const { rowId, columnId } = editingCell;
    const row = rows.find((r) => r.id === rowId);
    if (!row) { setEditingCell(null); return; }

    const type = colTypes.current.get(String(columnId));
    let parsedValue = editValue;

    if (type === 'NUMBER') {
      const num = parseFloat(editValue);
      if (editValue.trim() !== '' && isNaN(num)) {
        setCellErrors((prev) => ({ ...prev, [`${rowId}-${columnId}`]: 'Invalid number' }));
        setTimeout(() => setCellErrors((prev) => { const n = { ...prev }; delete n[`${rowId}-${columnId}`]; return n; }), 3000);
        return;
      }
      parsedValue = editValue.trim() === '' ? '' : num;
    } else if (type === 'BOOLEAN') {
      const lower = editValue.trim().toLowerCase();
      if (lower === 'true' || lower === 'false') {
        parsedValue = lower === 'true';
      } else {
        setCellErrors((prev) => ({ ...prev, [`${rowId}-${columnId}`]: 'Use true or false' }));
        setTimeout(() => setCellErrors((prev) => { const n = { ...prev }; delete n[`${rowId}-${columnId}`]; return n; }), 3000);
        return;
      }
    }

    const newValues = { ...row.values };
    if (parsedValue === '' || parsedValue === null || parsedValue === undefined) {
      delete newValues[String(columnId)];
    } else {
      newValues[String(columnId)] = parsedValue;
    }

    await updateRow(rowId, newValues);
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const renderCell = (row, column) => {
    const key = `${row.id}-${column.id}`;
    const hasError = cellErrors[key];
    const rawValue = row.values?.[String(column.id)];
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;

    const baseClasses = 'h-10 px-3 text-sm outline-none transition min-w-[140px] border-r border-zinc-200';
    const errorClasses = hasError ? 'bg-red-50 border-red-300' : 'hover:bg-zinc-50';

    if (isEditing) {
      return (
        <td key={key} className="p-0">
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className={`${baseClasses} w-full border-2 border-red-400 bg-white focus:ring-1 focus:ring-red-400/30`}
            placeholder={column.type === 'BOOLEAN' ? 'true/false' : column.type === 'NUMBER' ? '0' : ''}
          />
        </td>
      );
    }

    const displayValue = rawValue != null ? String(rawValue) : '';

    if (column.type === 'BOOLEAN') {
      return (
        <td
          key={key}
          className={`${baseClasses} ${errorClasses} cursor-pointer`}
          onClick={() => startEdit(row.id, column.id)}
          onDoubleClick={() => startEdit(row.id, column.id)}
        >
          {rawValue != null ? (
            <span className={`inline-flex items-center gap-1.5 ${rawValue ? 'text-emerald-600' : 'text-red-500'}`}>
              <span className={`h-3 w-3 rounded-full ${rawValue ? 'bg-emerald-500' : 'bg-red-400'}`} />
              {String(rawValue)}
            </span>
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </td>
      );
    }

    return (
      <td
        key={key}
        className={`${baseClasses} ${errorClasses} cursor-pointer`}
        onClick={() => startEdit(row.id, column.id)}
        onDoubleClick={() => startEdit(row.id, column.id)}
      >
        {displayValue || <span className="text-zinc-300">—</span>}
      </td>
    );
  };

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
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.03] overflow-hidden">
      {error && (
        <div className="mx-5 mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 md:mx-7">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="rounded p-0.5 hover:bg-red-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="h-10 w-[52px] min-w-[52px] bg-zinc-100 px-2 text-left text-xs font-medium text-zinc-400 border-b border-zinc-200 sticky left-0 z-10" />
              {columns.map((col) => (
                <th key={col.id} className="h-10 min-w-[140px] bg-zinc-100 px-3 text-left text-xs font-semibold text-zinc-700 border-b border-zinc-200 border-r border-zinc-200 group">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{col.name}</span>
                    <span className="hidden group-hover:flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => deleteColumn(col.id)}
                        className="h-5 w-5 flex items-center justify-center rounded text-zinc-400 hover:text-red-500 hover:bg-red-50"
                        title={`Delete ${col.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                </th>
              ))}
              <th className="h-10 w-[52px] min-w-[52px] bg-zinc-100 border-b border-zinc-200">
                <button
                  onClick={() => setIsAddColumnOpen(true)}
                  className="flex h-full w-full items-center justify-center text-zinc-400 hover:text-red-600 transition"
                  title="Add column"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="group">
                <td className="h-10 w-[52px] min-w-[52px] bg-zinc-50 px-2 text-xs text-zinc-400 border-b border-zinc-100 border-r border-zinc-200 sticky left-0 z-10 font-mono">
                  {idx + 1}
                </td>
                {columns.map((col) => renderCell(row, col))}
                <td className="h-10 w-[52px] border-b border-zinc-100">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="h-full w-full flex items-center justify-center text-zinc-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition"
                    title="Delete row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {/* Add row row */}
            <tr className="group">
              <td className="h-10 w-[52px] min-w-[52px] bg-zinc-50 px-2 text-xs text-zinc-400 border-b border-zinc-100 border-r border-zinc-200 sticky left-0 z-10 font-mono">
                {rows.length + 1}
              </td>
              {columns.map((col) => (
                <td key={`new-${col.id}`} className="p-0">
                  <input
                    value={newRowValues[String(col.id)] || ''}
                    onChange={(e) => handleNewRowValue(col.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitNewRow(); }}
                    onBlur={() => { /* don't auto-commit on blur for new row */ }}
                    placeholder={col.type === 'BOOLEAN' ? 'true/false' : col.type === 'NUMBER' ? '0' : ''}
                    className="h-10 w-full px-3 text-sm outline-none transition border-r border-zinc-200 bg-transparent placeholder:text-zinc-300 focus:bg-white"
                  />
                </td>
              ))}
              <td className="h-10 w-[52px] border-b border-zinc-100">
                <button
                  onClick={commitNewRow}
                  disabled={isSubmitting || Object.values(newRowValues).every((v) => !v || !v.trim())}
                  className="h-full w-full flex items-center justify-center text-zinc-400 hover:text-red-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Add row"
                >
                  {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </td>
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
