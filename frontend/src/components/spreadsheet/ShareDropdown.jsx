import { useEffect, useRef } from 'react';
import { FileText, MessageSquare } from 'lucide-react';

export function ShareDropdown({ onShareSheet, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
    >
      <button
        onClick={() => { onShareSheet(); onClose(); }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900">Sheet</p>
          <p className="text-xs text-zinc-500">Access to this sheet only</p>
        </div>
      </button>
    </div>
  );
}
