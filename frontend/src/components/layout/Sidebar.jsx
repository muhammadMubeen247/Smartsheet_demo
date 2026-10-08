import { Button } from '../ui/button';
import { BriefcaseBusiness, Grid2X2, House } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../lib/utils';

function getInitials(name) {
  return (name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function Sidebar({ collapsed = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { icon: House, label: 'Home', path: '/home' },
    { icon: BriefcaseBusiness, label: 'Workspaces', path: '/workspaces' },
  ];

  return (
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-30 flex flex-col bg-[#111111] text-zinc-300 transition-all duration-200 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}>
      <div className={`flex h-[74px] items-center ${collapsed ? 'justify-center gap-0' : 'gap-3'} border-b border-white/10 px-6`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white">
          <Grid2X2 className="h-[18px] w-[18px]" />
        </span>
        <span className={`sidebar-brand text-sm font-semibold tracking-wide text-white ${collapsed ? 'hidden' : ''}`}>Smartsheet Demo</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                'sidebar-link h-[42px] w-full justify-start rounded-xl px-3 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white',
                collapsed && '!justify-center !px-0',
                isActive && 'bg-red-600 text-white shadow-sm hover:bg-red-600 hover:text-white'
              )}
              onClick={() => navigate(item.path)}
            >
              <Icon className={`mr-3 h-[18px] w-[18px] shrink-0 ${collapsed ? '!mr-0' : ''}`} />
              <span className={`sidebar-label ${collapsed ? 'hidden' : ''}`}>{item.label}</span>
            </Button>
          );
        })}
      </nav>

      <div className={`flex items-center ${collapsed ? 'justify-center gap-0' : 'gap-3'} border-t border-white/10 px-5 py-4`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
          {getInitials(user?.name)}
        </div>
        <div className={`sidebar-user min-w-0 ${collapsed ? 'hidden' : ''}`}>
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-zinc-500">{user?.email}</p>
        </div>
      </div>
    </aside>
  );
}
