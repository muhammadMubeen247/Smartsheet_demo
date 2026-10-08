import { useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';

export function AddColumnDialog({ mode = 'create', direction, referenceColumnId, onAdd, onInsert, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('TEXT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isInsertMode = mode === 'insert';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const colName = name.trim();
    if (!colName) return;

    setIsSubmitting(true);
    setError('');
    try {
      if (isInsertMode) {
        await onInsert({ referenceColumnId, direction, name: colName, type });
      } else {
        const payload = {
          name: colName,
          type,
        };
        await onAdd(payload);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create column');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isInsertMode 
    ? `Insert Column ${direction === 'left' ? 'Left' : 'Right'}`
    : 'Add Column';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="col-name" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Column name
            </label>
            <input
              id="col-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Status"
              maxLength={100}
              className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
            />
          </div>

          <div>
            <label htmlFor="col-type" className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Column type
            </label>
            <select
              id="col-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
            >
              <option value="TEXT">Text</option>
              <option value="NUMBER">Number</option>
              <option value="BOOLEAN">Boolean</option>
              <option value="DATE">Date</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isInsertMode ? 'Insert' : 'Add column'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
