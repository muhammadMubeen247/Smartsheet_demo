import { useState, useEffect } from 'react';
import { X, MessageCircle, LoaderCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ThreadItem({ thread, onClick, rows }) {
  const topComment = thread.comments[0];
  const totalReplies = thread.comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0);
  const totalMessages = thread.comments.length + totalReplies;
  
  // Find row label (e.g., "Row 5")
  const rowLabel = thread.rowId 
    ? `Row ${rows.findIndex((r) => r.id === thread.rowId) + 1}`
    : 'Sheet-level';

  const initials = topComment.author?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  const preview = topComment.content.slice(0, 80);

  return (
    <button
      type="button"
      onClick={() => onClick(thread.rowId)}
      className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-left transition hover:bg-zinc-50 hover:border-zinc-300"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-zinc-900 truncate">
              {topComment.author?.name || 'Unknown'}
            </span>
            <span className="shrink-0 text-xs text-zinc-400">
              {formatTimeAgo(thread.lastActivity)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-medium">{rowLabel}</span>
            <span>·</span>
            <span>{totalMessages} {totalMessages === 1 ? 'message' : 'messages'}</span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-700 whitespace-pre-wrap break-words line-clamp-2">
            {preview}{topComment.content.length > 80 ? '…' : ''}
          </p>
        </div>
      </div>
    </button>
  );
}

export function ConversationsPanel({ sheetId, onClose, onThreadClick, rows }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConversations = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/sheets/${sheetId}/conversations`);
      setThreads(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [sheetId]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-[400px] max-w-full bg-white shadow-xl border-l border-zinc-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-zinc-500" />
            <h2 className="text-base font-semibold text-zinc-900">Conversations</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {threads.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Threads list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              <span className="mt-2 text-sm">Loading conversations…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <span className="text-sm">{error}</span>
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-10 w-10 text-zinc-300" />
              <h3 className="mt-3 text-base font-semibold text-zinc-800">No conversations yet</h3>
              <p className="mt-1 max-w-[240px] text-sm text-zinc-500">
                Click the comment icon on any row to start a conversation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => (
                <ThreadItem
                  key={thread.rowId ?? 'sheet'}
                  thread={thread}
                  onClick={onThreadClick}
                  rows={rows}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
