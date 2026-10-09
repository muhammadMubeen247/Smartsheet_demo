# Plan: Frontend Sheet Sharing UI

## Overview

Implement a Share dropdown and Share modal in `SheetHeader.jsx`, following existing patterns from `ColumnOptionsMenu.jsx` (dropdown click-outside behavior) and `AddColumnDialog.jsx` (modal overlay, form, loading states). The backend `POST /sheets/:sheetId/shares` endpoint already works (verified by E2E tests) and expects `{ email, permission }` where `permission` is one of `EDITOR`, `COMMENTER`, `VIEWER`.

---

## Files to Create

### 1. `frontend/src/components/spreadsheet/ShareDropdown.jsx`

**Purpose**: A dropdown that appears when clicking the Share button. Contains a single option — **Sheet** — that opens the sharing modal.

**Structure**:
```jsx
import { FileText } from 'lucide-react';

export function ShareDropdown({ onShareSheet, onClose }) {
  return (
    <div ref={dropdownRef} className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
      {/* Sheet option */}
      <button
        onClick={() => { onShareSheet(); onClose(); }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900">Sheet</p>
          <p className="text-xs text-zinc-500">Access to this sheet only</p>
        </div>
      </button>
    </div>
  );
}
```

**Behavior**:
- Click-outside dismisses the dropdown (same pattern as `ColumnOptionsMenu.jsx`)
- Escape key dismisses the dropdown
- Clicking "Sheet" closes dropdown and triggers `onShareSheet` callback

---

### 2. `frontend/src/components/spreadsheet/ShareModal.jsx`

**Purpose**: Modal dialog for entering an email and permission, then submitting to `POST /sheets/:sheetId/shares`.

**Structure** (inspired by `AddColumnDialog.jsx` patterns):
```jsx
import { useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import api from '../../lib/api';

const PERMISSION_OPTIONS = [
  { value: 'EDITOR', label: 'Editor', description: 'Can view, edit, and comment' },
  { value: 'COMMENTER', label: 'Commenter', description: 'Can view and comment only' },
  { value: 'VIEWER', label: 'Viewer', description: 'Can view only' },
];

export function ShareModal({ sheetName, sheetId, onSuccess, onClose }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('EDITOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Basic email validation regex
  const isValidEmail = email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to share sheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Share "{sheetName}"</h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3">
            {/* Email input */}
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Add people by email</label>
              <input
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
              />
            </div>

            {/* Permission select */}
            <div className="w-44">
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Permission</label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
              >
                {PERMISSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected permission description */}
          <p className="text-xs text-zinc-500">
            {PERMISSION_OPTIONS.find((o) => o.value === permission)?.description}
          </p>

          {/* Actions */}
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
              disabled={isSubmitting || !isValidEmail}
              className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
```

---

## Files to Modify

### 3. `frontend/src/components/spreadsheet/SheetHeader.jsx`

**Changes**:
1. Import `ShareDropdown` and `ShareModal` components
2. Import `Share2, ChevronDown` from lucide-react
3. Add state: `showDropdown`, `showModal`
4. Add refs for click-outside detection on dropdown
5. Wire the existing Share button to:
   - Toggle the dropdown (with chevron indicator)
   - Show "Share" button with a small down arrow icon when not expanded
   - Show a "Close" indicator when dropdown is open
6. Render `ShareDropdown` conditionally below the Share button
7. Render `ShareModal` conditionally when `showModal` is true
8. Pass `sheet.name` and `sheet.id` to the modal
9. On successful share, the modal closes (no additional toast needed — success is implied by modal closing)

**Key additions**:
```jsx
// State additions
const [showDropdown, setShowDropdown] = useState(false);
const [showModal, setShowModal] = useState(false);

// Dropdown ref and click-outside handler (same pattern as ColumnOptionsMenu)

// Share button becomes a dropdown toggle:
<button onClick={() => setShowDropdown(!showDropdown)}>
  <Share2 /> Share <ChevronDown />
</button>

// Conditional rendering:
{showDropdown && <ShareDropdown onShareSheet={() => setShowModal(true)} onClose={() => setShowDropdown(false)} />}
{showModal && <ShareModal sheetName={sheet.name} sheetId={sheet.id} onClose={() => setShowModal(false)} />}
```

---

## Backend Integration Summary

| Item | Value |
|------|-------|
| Endpoint | `POST /sheets/:sheetId/shares` |
| Request body | `{ email: string, permission: "EDITOR"|"COMMENTER"|"VIEWER" }` |
| Auth | JWT via `api` Axios instance (automatic) |
| Response | `{ data: shareObject }` with 201 status |
| Error responses | 400 (validation/owner share), 404 (unregistered email), 409 (duplicate share) |
| No backend changes needed | ✅ Confirmed — all E2E tests pass |

---

## Verification Steps

1. **Build**: Run `npm run build` in `frontend/` — expect no errors
2. **Lint**: Run `npm run lint` in `frontend/` — expect no errors
3. **Manual test flow**:
   - Navigate to any sheet view
   - Click **Share** button → dropdown appears with "Sheet" option
   - Click outside → dropdown dismisses
   - Press Escape → dropdown dismisses
   - Click "Sheet" → modal opens with sheet name in heading
   - Enter invalid email → submit button remains disabled
   - Enter valid email, select each permission level → description updates
   - Submit with unregistered email → error displayed (404)
   - Submit with duplicate share → error displayed (409)
   - Submit with registered user → modal closes, no error
4. **Network verification**: Check DevTools for `POST /sheets/:sheetId/shares` with correct payload `{ email, permission }`

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/components/spreadsheet/ShareDropdown.jsx` | **Create** | Dropdown with single "Sheet" option |
| `frontend/src/components/spreadsheet/ShareModal.jsx` | **Create** | Modal with email input + permission selector |
| `frontend/src/components/spreadsheet/SheetHeader.jsx` | **Modify** | Wire up dropdown and modal to Share button |

## Design Decisions

1. **No collaborators list** — out of scope per task requirements
2. **No toast/success notification** — modal closing is the success signal (follows existing `AddColumnDialog` pattern)
3. **Default permission = EDITOR** — matches most common use case
4. **Email validation** — basic regex before submission; backend also validates
5. **Color scheme** — uses existing `red-600` primary action color consistent with the app's design
6. **Modal width** — `max-w-lg` (512px) to fit both email input and permission dropdown side-by-side