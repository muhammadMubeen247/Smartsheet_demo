import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil, ArrowLeftToLine, ArrowRightToLine, Trash2 } from 'lucide-react';

export function ColumnOptionsMenu({ column, isPrimary, onRename, onInsert, onDelete, onClose }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(column.name);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isRenaming) inputRef.current?.focus();
  }, [isRenaming]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== column.name) {
      onRename(column.id, trimmed);
    }
    setIsRenaming(false);
    onClose();
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Escape') {
      setNameValue(column.name);
      setIsRenaming(false);
      onClose();
    }
  };

  if (isRenaming) {
    return (
      <div ref={menuRef} className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
        <form onSubmit={handleRenameSubmit}>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Rename column</label>
          <input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            className="h-8 w-full rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            maxLength={100}
          />
        </form>
      </div>
    );
  }

  const items = [
    {
      icon: Pencil,
      label: 'Rename',
      onClick: () => setIsRenaming(true),
    },
    {
      icon: ArrowLeftToLine,
      label: 'Insert column left',
      onClick: () => { onInsert(column.id, 'left'); onClose(); },
    },
    {
      icon: ArrowRightToLine,
      label: 'Insert column right',
      onClick: () => { onInsert(column.id, 'right'); onClose(); },
    },
    { divider: true },
    {
      icon: Trash2,
      label: 'Delete column',
      danger: true,
      onClick: () => { onDelete(column.id); onClose(); },
      disabled: isPrimary,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
    >
      {items.map((item, i) => {
        if (item.divider) {
          return <div key={i} className="my-1 border-t border-zinc-100" />;
        }
        const Icon = item.icon;
        return (
          <button
            key={i}
            onClick={item.onClick}
            disabled={item.disabled}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
              item.danger
                ? 'text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
                : 'text-zinc-700 hover:bg-zinc-50'
            }`}
            title={item.disabled ? 'Cannot delete the primary column' : undefined}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
