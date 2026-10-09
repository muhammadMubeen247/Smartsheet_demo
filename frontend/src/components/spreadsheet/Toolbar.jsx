import {
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Strikethrough,
  Type, Minus, Plus, Palette, Brush, Hash, Percent, DollarSign,
  Calendar, CheckSquare, SortAsc, Filter, Grid3X3, MessageSquare,
} from 'lucide-react';

const toolbarGroups = [
  {
    label: 'View',
    items: [
      { icon: Grid3X3, label: 'Table', active: true },
      { icon: Filter, label: 'Filter' },
      { icon: SortAsc, label: 'Sort' },
    ],
  },
  {
    label: 'Format',
    items: [
      { icon: Type, label: 'Font' },
      { icon: Minus, label: 'Decrease font size' },
      { icon: Plus, label: 'Increase font size' },
      { icon: Bold, label: 'Bold' },
      { icon: Italic, label: 'Italic' },
      { icon: Underline, label: 'Underline' },
      { icon: Strikethrough, label: 'Strikethrough' },
    ],
  },
  {
    label: 'Text color & alignment',
    items: [
      { icon: Palette, label: 'Text color' },
      { icon: Brush, label: 'Fill color' },
      { icon: AlignLeft, label: 'Left align' },
      { icon: AlignCenter, label: 'Center align' },
      { icon: AlignRight, label: 'Right align' },
    ],
  },
  {
    label: 'Data types',
    items: [
      { icon: Hash, label: 'Number' },
      { icon: Percent, label: 'Percentage' },
      { icon: DollarSign, label: 'Currency' },
      { icon: Calendar, label: 'Date' },
      { icon: CheckSquare, label: 'Checkbox' },
    ],
  },
];

export function Toolbar({ onComment }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50/80 px-4 py-2">
      {toolbarGroups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <div className="mx-1 h-5 w-px bg-zinc-200" />}
          {group.items.map((item, ii) => {
            const Icon = item.icon;
            return (
              <button
                key={`${gi}-${ii}`}
                type="button"
                title={`${item.label} — not yet supported`}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700 ${
                  item.active ? 'bg-zinc-200/70 text-zinc-700' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      ))}
      <div className="ml-1 h-5 w-px bg-zinc-200" />
      <button
        type="button"
        onClick={() => onComment?.()}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700"
        title="Add comment"
      >
        <MessageSquare className="h-4 w-4" />
      </button>
    </div>
  );
}
