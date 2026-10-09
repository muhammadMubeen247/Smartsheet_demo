import { useState, useEffect, useRef, useCallback } from 'react';
import { LoaderCircle, X, UserPlus } from 'lucide-react';
import api from '../../lib/api';

const PERMISSION_OPTIONS = [
  { value: 'EDITOR', label: 'Editor', description: 'Can view, edit, and comment' },
  { value: 'COMMENTER', label: 'Commenter', description: 'Can view and comment only' },
  { value: 'VIEWER', label: 'Viewer', description: 'Can view only' },
];

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function ShareModal({ sheetName, sheetId, onClose }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('EDITOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Search state
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Refs for canceling stale requests
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef(null);
  const searchAbortRef = useRef(null);

  const isValidEmail = email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const performSearch = useCallback(async (query) => {
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    // Increment request ID to track staleness
    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    setIsSearching(true);

    // Cancel previous in-flight request if possible
    if (searchAbortRef.current) {
      searchAbortRef.current.cancel();
    }

    const source = api.CancelToken ? api.CancelToken.source() : null;
    searchAbortRef.current = source;

    try {
      const { data } = await api.get('/users/search', {
        params: { q: query },
        cancelToken: source?.token,
      });

      // Only update if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setSuggestions(data.data || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      // Ignore cancellation errors
      if (err.code === 'ERR_CANCELED' || err.message === 'canceled') return;

      // Only update if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setError('');
    setSuggestions([]);
    setShowSuggestions(false);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only search if it looks like the start of an email
    const trimmed = value.trim();
    if (trimmed.length >= MIN_QUERY_LENGTH && trimmed.includes('@')) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(trimmed);
      }, DEBOUNCE_MS);
    } else if (trimmed.length < MIN_QUERY_LENGTH) {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (user) => {
    setEmail(user.email);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail) return;

    setIsSubmitting(true);
    setError('');
    try {
      await api.post(`/sheets/${sheetId}/shares`, {
        email: email.trim(),
        permission,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to share sheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Share &ldquo;{sheetName}&rdquo;
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            {/* Email input with suggestions */}
            <div className="relative min-w-0 flex-1">
              <label htmlFor="share-email" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Add people by email
              </label>
              <div className="relative">
                <input
                  id="share-email"
                  autoFocus
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter email address"
                  type="email"
                  autoComplete="off"
                  className="h-10 w-full rounded-lg border border-zinc-300 px-3 pr-8 text-sm outline-none transition placeholder:text-zinc-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                />
                {isSearching && (
                  <LoaderCircle className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                  {suggestions.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-500">
                      <UserPlus className="h-4 w-4" />
                      <span>No users found</span>
                    </div>
                  ) : (
                    suggestions.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(user)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
                          <p className="truncate text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Permission select */}
            <div className="w-44 shrink-0">
              <label htmlFor="share-permission" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                Permission
              </label>
              <select
                id="share-permission"
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
              >
                {PERMISSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Permission description */}
          <p className="text-xs text-zinc-500">
            {PERMISSION_OPTIONS.find((o) => o.value === permission)?.description}
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValidEmail}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Share
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
