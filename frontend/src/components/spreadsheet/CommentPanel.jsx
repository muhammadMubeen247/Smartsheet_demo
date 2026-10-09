import { useState, useEffect, useRef } from 'react';
import { X, Send, LoaderCircle, AlertCircle, MessageCircle } from 'lucide-react';
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

function CommentItem({ comment, onReply, submittingReply }) {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const initials = comment.author?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  const submitReply = () => {
    if (!replyText.trim() || submittingReply) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReply(false);
  };

  return (
    <div className="mb-4">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">
              {comment.author?.name || 'Unknown'}
            </span>
            <span className="text-xs text-zinc-400">{formatTimeAgo(comment.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap break-words">{comment.content}</p>

          {/* Replies */}
          {comment.replies?.length > 0 && (
            <div className="mt-2 ml-1 space-y-2">
              {comment.replies.map((reply) => {
                const rInitials = reply.author?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
                return (
                  <div key={reply.id} className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
                      {rInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-800">
                          {reply.author?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-zinc-400">{formatTimeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-600 whitespace-pre-wrap break-words">{reply.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply button */}
          <button
            type="button"
            onClick={() => setShowReply(!showReply)}
            className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
          >
            Reply
          </button>

          {/* Reply input */}
          {showReply && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitReply(); }}
                placeholder="Write a reply…"
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200"
                disabled={submittingReply}
                autoFocus
              />
              <button
                type="button"
                onClick={submitReply}
                disabled={!replyText.trim() || submittingReply}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                title="Send reply"
              >
                {submittingReply ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentPanel({ sheetId, rowId, rowLabel, onClose, user, onCommentChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const inputRef = useRef(null);

  const fetchComments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/sheets/${sheetId}/rows/${rowId}/comments`);
      setComments(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [sheetId, rowId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submitComment = () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    api
      .post(`/sheets/${sheetId}/rows/${rowId}/comments`, { content: commentText.trim() })
      .then(() => {
        setCommentText('');
        fetchComments();
        onCommentChange?.();
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to submit comment');
      })
      .finally(() => setSubmitting(false));
  };

  const submitReply = async (parentCommentId, content) => {
    setSubmittingReply(true);
    try {
      await api.post(`/comments/${parentCommentId}/replies`, { content });
      fetchComments();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit reply');
    } finally {
      setSubmittingReply(false);
    }
  };

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
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Row selector */}
        <div className="border-b border-zinc-200 px-4 py-2">
          <select
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 outline-none focus:border-red-400"
            value={rowId}
            onChange={() => {}}
            disabled
          >
            <option>{rowLabel || `Row ${rowId}`}</option>
          </select>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              <span className="mt-2 text-sm">Loading comments…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <span className="text-sm">{error}</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-10 w-10 text-zinc-300" />
              <h3 className="mt-3 text-base font-semibold text-zinc-800">Start the conversation</h3>
              <p className="mt-1 max-w-[240px] text-sm text-zinc-500">
                Type a message below to collaborate with your team.
              </p>
            </div>
          ) : (
            <div>
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} onReply={submitReply} submittingReply={submittingReply} />
              ))}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-zinc-200 p-4">
          <div className="flex items-end gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
              {user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
            </div>
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                placeholder="Add a comment…"
                rows={1}
                disabled={submitting}
                className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-red-400 focus:ring-1 focus:ring-red-200 disabled:bg-zinc-50"
                style={{ minHeight: '36px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="button"
              onClick={submitComment}
              disabled={!commentText.trim() || submitting}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              title="Send"
            >
              {submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
