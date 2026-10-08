import { useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../ui/button';

function getInitials(name) {
  return (name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isWorkspaces = location.pathname.startsWith('/workspaces');
  const title = isWorkspaces ? 'Workspaces' : 'Home';
  const description = isWorkspaces
    ? 'Organize your work in one place'
    : 'A clear view of your work and activity';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header fixed right-0 top-0 z-20 flex h-[74px] items-center justify-between border-b border-zinc-200 bg-white px-5 sm:px-7 lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-0.5 hidden text-xs text-zinc-500 sm:block">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>

        <div className="relative">
          <Button
            variant="ghost"
            aria-label="Open account menu"
            aria-expanded={showProfileMenu}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="h-auto rounded-full p-0 hover:bg-transparent"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
              {getInitials(user?.name)}
            </span>
          </Button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl shadow-zinc-900/10">
              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="truncate text-sm font-medium text-zinc-900">{user?.name}</p>
                <p className="truncate text-xs text-zinc-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
              >
                <LogOut className="h-4 w-4 text-zinc-500" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
