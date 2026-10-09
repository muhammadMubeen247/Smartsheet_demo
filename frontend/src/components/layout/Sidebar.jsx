import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { BriefcaseBusiness, ChevronDown, ChevronRight, FileSpreadsheet, Grid2X2, House, Share2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

function getInitials(name) {
  return (name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function permissionBadge(permission) {
  const map = {
    EDITOR: 'bg-emerald-500/10 text-emerald-400',
    COMMENTER: 'bg-amber-500/10 text-amber-400',
    VIEWER: 'bg-blue-500/10 text-blue-400',
  };
  const cls = map[permission] || 'bg-zinc-500/10 text-zinc-400';
  return (
    <span className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wider ${cls}`}>
      {permission}
    </span>
  );
}

export function Sidebar({ collapsed = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const [ownedWorkspaces, setOwnedWorkspaces] = useState([]);
  const [sharedWorkspaces, setSharedWorkspaces] = useState([]);
  const [sharedSheets, setSharedSheets] = useState([]);
  const [sharedSheetsError, setSharedSheetsError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [detailsMap, setDetailsMap] = useState({});

  const navItems = [
    { icon: House, label: 'Home', path: '/home' },
    { icon: BriefcaseBusiness, label: 'Workspaces', path: '/workspaces' },
  ];

  useEffect(() => {
    if (collapsed) return;
    Promise.all([
      api.get('/workspaces')
        .then((r) => setOwnedWorkspaces(r.data?.data || []))
        .catch(() => {}),
      api.get('/workspaces/shared-with-me')
        .then((r) => setSharedWorkspaces(Array.isArray(r.data) ? r.data : []))
        .catch(() => {}),
      api.get('/sheets/shared-with-me')
        .then((r) => {
          setSharedSheets(r.data?.data || []);
          setSharedSheetsError('');
        })
        .catch((error) => {
          setSharedSheetsError(error.response?.data?.error?.message || 'Unable to load shared sheets');
        }),
    ]);
  }, [collapsed]);

  async function toggleExpand(ws) {
    if (expandedId === ws.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(ws.id);
    if (!detailsMap[ws.id]) {
      try {
        const res = await api.get(`/workspaces/${ws.id}`);
        setDetailsMap((prev) => ({ ...prev, [ws.id]: res.data?.data || {} }));
      } catch {
        // ignore
      }
    }
  }

  const sheets = detailsMap[expandedId]?.sheets || [];

  return (
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-30 flex flex-col bg-[#111111] text-zinc-300 transition-all duration-200 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}>
      <div className={`flex h-[74px] items-center ${collapsed ? 'justify-center gap-0' : 'gap-3'} border-b border-white/10 px-6`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white">
          <Grid2X2 className="h-[18px] w-[18px]" />
        </span>
        <span className={`sidebar-brand text-sm font-semibold tracking-wide text-white ${collapsed ? 'hidden' : ''}`}>Smartsheet Demo</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
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
        </div>

        {!collapsed && (
          <>
            <div className="mt-6 mb-2 flex items-center justify-between px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Your Workspaces</span>
            </div>
            <div className="space-y-0.5">
              {ownedWorkspaces.length === 0 ? (
                <p className="px-3 text-xs text-zinc-600">No workspaces</p>
              ) : (
                ownedWorkspaces.map((ws) => (
                  <div key={ws.id}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(ws)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
                    >
                      {expandedId === ws.id ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      )}
                      <BriefcaseBusiness className="h-4 w-4 shrink-0 text-zinc-500" />
                      <span className="truncate">{ws.name}</span>
                    </button>
                    {expandedId === ws.id && (
                      <div className="ml-9 mt-0.5 space-y-0.5">
                        {sheets.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-zinc-600">No sheets</p>
                        ) : (
                          sheets.map((sheet) => (
                            <button
                              key={sheet.id}
                              type="button"
                              onClick={() => navigate(`/workspaces/${ws.id}/sheets/${sheet.id}`)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-white/5 hover:text-white',
                                location.pathname.includes(`/sheets/${sheet.id}`) && 'bg-white/5 text-white'
                              )}
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{sheet.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 mb-2 flex items-center justify-between px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Shared workspaces</span>
              <Share2 className="h-3 w-3 text-zinc-600" />
            </div>
            <div className="space-y-0.5">
              {sharedWorkspaces.length === 0 ? (
                <p className="px-3 text-xs text-zinc-600">No shared workspaces</p>
              ) : (
                sharedWorkspaces.map((ws) => (
                  <div key={`shared-${ws.id}`}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(ws)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
                    >
                      {expandedId === ws.id ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      )}
                      <Share2 className="h-4 w-4 shrink-0 text-zinc-500" />
                      <span className="min-w-0 truncate">{ws.name}</span>
                      {!collapsed && permissionBadge(ws.permission)}
                    </button>
                    {expandedId === ws.id && (
                      <div className="ml-9 mt-0.5 space-y-0.5">
                        {sheets.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-zinc-600">No sheets</p>
                        ) : (
                          sheets.map((sheet) => (
                            <button
                              key={sheet.id}
                              type="button"
                              onClick={() => navigate(`/workspaces/${ws.id}/sheets/${sheet.id}`)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-white/5 hover:text-white',
                                location.pathname.includes(`/sheets/${sheet.id}`) && 'bg-white/5 text-white'
                              )}
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{sheet.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 mb-2 flex items-center justify-between px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Shared sheets</span>
              <Share2 className="h-3 w-3 text-zinc-600" />
            </div>
            <div className="space-y-0.5">
              {sharedSheetsError ? (
                <p role="alert" className="px-3 text-xs text-red-400">{sharedSheetsError}</p>
              ) : sharedSheets.length === 0 ? (
                <p className="px-3 text-xs text-zinc-600">No shared sheets</p>
              ) : (
                sharedSheets.map((sheet) => (
                  <button
                    key={`shared-sheet-${sheet.id}`}
                    type="button"
                    onClick={() => navigate(`/workspaces/${sheet.workspaceId}/sheets/${sheet.id}`)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-white/5 hover:text-white',
                      location.pathname.includes(`/sheets/${sheet.id}`) && 'bg-white/5 text-white'
                    )}
                    title={`${sheet.name} · ${sheet.workspaceName}`}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{sheet.name}</span>
                    {!collapsed && permissionBadge(sheet.permission)}
                  </button>
                ))
              )}
            </div>
          </>
        )}
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
