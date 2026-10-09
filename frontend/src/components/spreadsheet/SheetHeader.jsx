import { useState } from 'react';
import { FileText, Share2, ChevronDown, LoaderCircle } from 'lucide-react';
import api from '../../lib/api';
import { ShareDropdown } from './ShareDropdown';
import { ShareModal } from './ShareModal';

export function SheetHeader({ sheet, workspaceId, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(sheet.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleRename = async () => {
    const name = editName.trim();
    if (!name || name === sheet.name) {
      setIsEditing(false);
      setEditName(sheet.name);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const { data } = await api.put(`/sheets/${sheet.id}`, { name });
      if (onRename) onRename(data.data);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to rename sheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Sheet</p>
          {isEditing ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') { setIsEditing(false); setEditName(sheet.name); }
                }}
                onBlur={handleRename}
                className="h-8 rounded-lg border border-red-400 bg-white px-2 text-xl font-semibold tracking-tight text-zinc-900 outline-none focus:ring-2 focus:ring-red-400/30"
                maxLength={100}
              />
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin text-red-500" />}
            </div>
          ) : (
            <h1
              className="mt-1 break-words text-xl font-semibold tracking-tight text-zinc-900 cursor-pointer hover:text-red-600 transition"
              onClick={() => { setIsEditing(true); setEditName(sheet.name); setError(''); }}
              title="Click to rename"
            >
              {sheet.name}
            </h1>
          )}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <p className="mt-0.5 text-sm text-zinc-500">
            {sheet.columns?.length ?? 0} columns · {(sheet._count?.rows ?? 0)} rows
          </p>
        </div>
      </div>

      <div className="relative flex items-center gap-2 self-start">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white transition hover:bg-red-700"
          onClick={() => setShowShareDropdown((v) => !v)}
        >
          <Share2 className="h-4 w-4" />
          Share
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showShareDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showShareDropdown && (
          <ShareDropdown
            onShareSheet={() => setShowShareModal(true)}
            onClose={() => setShowShareDropdown(false)}
          />
        )}

        {showShareModal && (
          <ShareModal
            sheetName={sheet.name}
            sheetId={sheet.id}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </div>
  );
}
