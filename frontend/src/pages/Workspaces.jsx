import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  LoaderCircle,
  Plus,
  Share2,
  UserRound,
  X,
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

function errorMessage(error, fallback) {
  return error.response?.data?.error?.message || fallback;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function Workspaces() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceDetails, setWorkspaceDetails] = useState({});
  const [loadingWorkspaceIds, setLoadingWorkspaceIds] = useState(() => new Set());
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [detailErrors, setDetailErrors] = useState({});
  const [actionError, setActionError] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [sheetName, setSheetName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState(() => new Set());
  const [sharedWorkspaces, setSharedWorkspaces] = useState([]);
  const [sharedSheets, setSharedSheets] = useState([]);
  const [sharedSheetsLoading, setSharedSheetsLoading] = useState(true);
  const [sharedSheetsError, setSharedSheetsError] = useState('');
  const detailRequests = useRef(new Map());

  const loadWorkspaceDetails = useCallback((id) => {
    const key = String(id);
    if (workspaceDetails[key]) return Promise.resolve(workspaceDetails[key]);
    if (detailRequests.current.has(key)) return detailRequests.current.get(key);

    setLoadingWorkspaceIds((current) => new Set(current).add(key));
    const request = api
      .get(`/workspaces/${key}`)
      .then(({ data }) => {
        setWorkspaceDetails((current) => ({ ...current, [key]: data.data }));
        return data.data;
      })
      .finally(() => {
        setLoadingWorkspaceIds((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
        detailRequests.current.delete(key);
      });

    detailRequests.current.set(key, request);
    return request;
  }, [workspaceDetails]);

  useEffect(() => {
    let active = true;
    setListLoading(true);
    setListError('');

    Promise.all([
      api.get('/workspaces').then(({ data }) => {
        if (active) setWorkspaces(data.data);
      }),
      api.get('/workspaces/shared-with-me').then(({ data }) => {
        if (active) setSharedWorkspaces(Array.isArray(data) ? data : []);
      }),
      api.get('/sheets/shared-with-me')
        .then(({ data }) => {
          if (active) setSharedSheets(data.data || []);
        })
        .catch((error) => {
          if (active) setSharedSheetsError(errorMessage(error, 'Unable to load sheets shared with you.'));
        })
        .finally(() => {
          if (active) setSharedSheetsLoading(false);
        }),
    ])
      .catch((error) => {
        if (active) setListError(errorMessage(error, 'Unable to load your workspaces.'));
      })
      .finally(() => {
        if (active) setListLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    if (workspaceDetails[String(workspaceId)]) {
      setDetailErrors((current) => {
        if (!current[String(workspaceId)]) return current;
        const next = { ...current };
        delete next[String(workspaceId)];
        return next;
      });
      return;
    }

    let active = true;
    setDetailErrors((current) => {
      if (!current[String(workspaceId)]) return current;
      const next = { ...current };
      delete next[String(workspaceId)];
      return next;
    });
    loadWorkspaceDetails(workspaceId).catch((error) => {
      if (active) {
        setDetailErrors((current) => ({
          ...current,
          [String(workspaceId)]: errorMessage(error, 'Unable to load this workspace.'),
        }));
      }
    });

    return () => {
      active = false;
    };
  }, [workspaceId, workspaceDetails, loadWorkspaceDetails]);

  const selectedWorkspace = workspaceId ? workspaceDetails[String(workspaceId)] : null;
  const selectedWorkspaceLoading = Boolean(
    workspaceId && loadingWorkspaceIds.has(String(workspaceId)) && !selectedWorkspace
  );

  const selectWorkspace = (id) => {
    navigate(`/workspaces/${id}`);
  };

  const toggleWorkspace = (id) => {
    const key = String(id);
    const isExpanded = expandedWorkspaceIds.has(key);
    setExpandedWorkspaceIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

    if (!isExpanded && !workspaceDetails[key]) {
      setDetailErrors((current) => {
        if (!current[key]) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
      loadWorkspaceDetails(id).catch((error) => {
        setDetailErrors((current) => ({
          ...current,
          [key]: errorMessage(error, 'Unable to load sheets for this workspace.'),
        }));
      });
    }
  };

  const createWorkspace = async (event) => {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) return;

    setIsSubmitting(true);
    setActionError('');
    try {
      const { data } = await api.post('/workspaces', { name });
      const workspace = { ...data.data, sheets: [] };
      setWorkspaces((current) => [workspace, ...current]);
      setWorkspaceDetails((current) => ({ ...current, [String(workspace.id)]: workspace }));
      setWorkspaceName('');
      setIsCreatingWorkspace(false);
      navigate(`/workspaces/${workspace.id}`);
    } catch (error) {
      setActionError(errorMessage(error, 'Unable to create the workspace.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const createSheet = async (event) => {
    event.preventDefault();
    const name = sheetName.trim();
    if (!name || !selectedWorkspace) return;

    setIsSubmitting(true);
    setActionError('');
    try {
      const { data } = await api.post(`/workspaces/${selectedWorkspace.id}/sheets`, { name });
      setWorkspaceDetails((current) => {
        const key = String(selectedWorkspace.id);
        const details = current[key];
        return {
          ...current,
          [key]: { ...details, sheets: [data.data, ...(details.sheets || [])] },
        };
      });
      setSheetName('');
      setIsCreatingSheet(false);
      setExpandedWorkspaceIds((current) => new Set(current).add(String(selectedWorkspace.id)));
    } catch (error) {
      setActionError(errorMessage(error, 'Unable to create the sheet.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="workspace-browser workspace-browser-grid min-h-[calc(100vh-126px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-900/[0.03]">
      <aside className="workspace-tree min-w-0 border-b border-zinc-200 bg-zinc-50/70">
        <div className="flex h-[62px] items-center justify-between border-b border-zinc-200 px-4">
          <h2 className="text-sm font-semibold text-zinc-900">Browse</h2>
          <button
            type="button"
            onClick={() => {
              setIsCreatingWorkspace((current) => !current);
              setActionError('');
            }}
            aria-label={isCreatingWorkspace ? 'Cancel workspace creation' : 'Create workspace'}
            title={isCreatingWorkspace ? 'Cancel' : 'Create workspace'}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-900"
          >
            {isCreatingWorkspace ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>

        <div className="px-3 py-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Your workspaces
          </p>

          {isCreatingWorkspace && (
            <form onSubmit={createWorkspace} className="mb-3 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm">
              <label htmlFor="workspace-name" className="mb-1.5 block text-xs font-medium text-zinc-700">
                Workspace name
              </label>
              <input
                id="workspace-name"
                autoFocus
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="e.g. Product planning"
                maxLength={100}
                className="h-9 w-full rounded-lg border border-zinc-300 px-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
              />
              <button
                type="submit"
                disabled={isSubmitting || !workspaceName.trim()}
                className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Create workspace
              </button>
            </form>
          )}

          {listLoading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-zinc-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading workspaces
            </div>
          ) : listError ? (
            <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">{listError}</div>
          ) : workspaces.length === 0 ? (
            <p className="px-2 py-3 text-sm leading-5 text-zinc-500">No workspaces yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-1">
              {workspaces.map((workspace) => {
                const key = String(workspace.id);
                const isSelected = key === String(workspaceId);
                const isExpanded = expandedWorkspaceIds.has(key) || isSelected;
                const details = workspaceDetails[key];
                const isLoading = loadingWorkspaceIds.has(key) && !details;

                return (
                  <li key={workspace.id}>
                    <div className={`flex items-center rounded-lg pr-1 transition ${isSelected ? 'bg-red-50 text-red-800' : 'text-zinc-700 hover:bg-zinc-100'}`}>
                      <button
                        type="button"
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${workspace.name}`}
                        aria-expanded={isExpanded}
                        onClick={() => toggleWorkspace(workspace.id)}
                        className="flex h-9 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-800"
                      >
                        {isLoading ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => selectWorkspace(workspace.id)}
                        aria-current={isSelected ? 'page' : undefined}
                        className="flex h-9 min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-medium"
                      >
                        <BriefcaseBusiness className={`h-4 w-4 shrink-0 ${isSelected ? 'text-red-600' : 'text-zinc-400'}`} />
                        <span className="truncate">{workspace.name}</span>
                      </button>
                    </div>

                    {isExpanded && (
                      <ul className="ml-[17px] mt-1 space-y-0.5 border-l border-zinc-200 pl-3">
                        {isLoading ? (
                          <li className="flex items-center gap-2 py-2 pl-1 text-xs text-zinc-500">
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            Loading sheets
                          </li>
                        ) : detailErrors[key] ? (
                          <li className="py-2 pl-1 text-xs text-red-600">
                            <p>{detailErrors[key]}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setDetailErrors((current) => {
                                  const next = { ...current };
                                  delete next[key];
                                  return next;
                                });
                                loadWorkspaceDetails(workspace.id).catch((error) => {
                                  setDetailErrors((current) => ({
                                    ...current,
                                    [key]: errorMessage(error, 'Unable to load sheets for this workspace.'),
                                  }));
                                });
                              }}
                              className="mt-1 font-semibold underline underline-offset-2"
                            >
                              Try again
                            </button>
                          </li>
                        ) : details?.sheets?.length ? (
                          details.sheets.map((sheet) => (
                            <li key={sheet.id}>
                              <button
                                type="button"
                                onClick={() => navigate(`/workspaces/${workspace.id}/sheets/${sheet.id}`)}
                                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-zinc-600 transition hover:bg-zinc-200/60 hover:text-zinc-900"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                <span className="truncate text-left">{sheet.name}</span>
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="py-2 pl-1 text-xs text-zinc-400">No sheets</li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-3 py-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Shared workspaces
          </p>

          {listLoading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-zinc-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading shared workspaces
            </div>
          ) : sharedWorkspaces.length === 0 ? (
            <p className="px-2 py-3 text-sm leading-5 text-zinc-500">No workspaces shared with you.</p>
          ) : (
            <ul className="space-y-1">
              {sharedWorkspaces.map((workspace) => {
                const key = String(workspace.id);
                const isSelected = key === String(workspaceId);
                const isExpanded = expandedWorkspaceIds.has(key) || isSelected;
                const details = workspaceDetails[key];
                const isLoading = loadingWorkspaceIds.has(key) && !details;

                return (
                  <li key={key}>
                    <div className={`flex items-center rounded-lg pr-1 transition ${isSelected ? 'bg-red-50 text-red-800' : 'text-zinc-700 hover:bg-zinc-100'}`}>
                      <button
                        type="button"
                        onClick={() => toggleWorkspace(workspace.id)}
                        className="flex h-9 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-800"
                      >
                        {isLoading ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => selectWorkspace(workspace.id)}
                        aria-current={isSelected ? 'page' : undefined}
                        className="flex h-9 min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-medium"
                      >
                        <Share2 className={`h-4 w-4 shrink-0 ${isSelected ? 'text-red-600' : 'text-zinc-400'}`} />
                        <span className="truncate">{workspace.name}</span>
                      </button>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        workspace.permission === 'EDITOR' ? 'bg-emerald-50 text-emerald-700' :
                        workspace.permission === 'COMMENTER' ? 'bg-blue-50 text-blue-700' :
                        'bg-zinc-100 text-zinc-600'
                      }`}>
                        {workspace.permission}
                      </span>
                    </div>

                    {isExpanded && (
                      <ul className="ml-[17px] mt-1 space-y-0.5 border-l border-zinc-200 pl-3">
                        {isLoading ? (
                          <li className="flex items-center gap-2 py-2 pl-1 text-xs text-zinc-500">
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            Loading sheets
                          </li>
                        ) : detailErrors[key] ? (
                          <li className="py-2 pl-1 text-xs text-red-600">
                            <p>{detailErrors[key]}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setDetailErrors((current) => {
                                  const next = { ...current };
                                  delete next[key];
                                  return next;
                                });
                                loadWorkspaceDetails(key).catch((error) => {
                                  setDetailErrors((current) => ({
                                    ...current,
                                    [key]: errorMessage(error, 'Unable to load sheets for this workspace.'),
                                  }));
                                });
                              }}
                              className="mt-1 font-semibold underline underline-offset-2"
                            >
                              Try again
                            </button>
                          </li>
                        ) : details?.sheets?.length ? (
                          details.sheets.map((sheet) => (
                            <li key={sheet.id}>
                              <button
                                type="button"
                                onClick={() => navigate(`/workspaces/${workspace.id}/sheets/${sheet.id}`)}
                                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-zinc-600 transition hover:bg-zinc-200/60 hover:text-zinc-900"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                <span className="truncate text-left">{sheet.name}</span>
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="py-2 pl-1 text-xs text-zinc-400">No sheets</li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-3 py-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Shared sheets
          </p>

          {sharedSheetsLoading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-zinc-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading shared sheets
            </div>
          ) : sharedSheetsError ? (
            <p role="alert" className="px-2 py-3 text-sm leading-5 text-red-600">{sharedSheetsError}</p>
          ) : sharedSheets.length === 0 ? (
            <p className="px-2 py-3 text-sm leading-5 text-zinc-500">No sheets shared with you.</p>
          ) : (
            <ul className="space-y-1">
              {sharedSheets.map((sheet) => (
                <li key={sheet.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/workspaces/${sheet.workspaceId}/sheets/${sheet.id}`)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-zinc-100"
                  >
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-800">{sheet.name}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {sheet.workspaceName} · Shared by {sheet.ownerName}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      sheet.permission === 'EDITOR' ? 'bg-emerald-50 text-emerald-700' :
                      sheet.permission === 'COMMENTER' ? 'bg-blue-50 text-blue-700' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {sheet.permission}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="workspace-main min-w-0">
        {actionError && (
          <div role="alert" className="mx-5 mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 md:mx-7">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setActionError('')}
              className="ml-auto rounded p-0.5 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {selectedWorkspaceLoading ? (
          <div className="flex min-h-[400px] items-center justify-center gap-2 text-sm text-zinc-500">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading workspace
          </div>
        ) : workspaceId && detailErrors[String(workspaceId)] ? (
          <div role="alert" className="m-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Unable to open this workspace</p>
              <p className="mt-1">{detailErrors[String(workspaceId)]}</p>
              <Link to="/workspaces" className="mt-3 inline-block font-semibold underline underline-offset-2">
                Back to workspaces
              </Link>
            </div>
          </div>
        ) : selectedWorkspace ? (
          <>
            <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between md:px-7 md:py-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Workspace</p>
                  <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-zinc-900">{selectedWorkspace.name}</h1>
                  <p className="mt-1 text-sm text-zinc-500">Sheets and work organized in one place.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingSheet((current) => !current);
                  setActionError('');
                }}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                {isCreatingSheet ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isCreatingSheet ? 'Cancel' : 'New sheet'}
              </button>
            </div>

            <div className="px-5 py-5 md:px-7 md:py-6">
              {isCreatingSheet && (
                <form onSubmit={createSheet} className="mb-5 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="sheet-name" className="mb-1.5 block text-xs font-semibold text-zinc-700">
                      Sheet name
                    </label>
                    <input
                      id="sheet-name"
                      autoFocus
                      value={sheetName}
                      onChange={(event) => setSheetName(event.target.value)}
                      placeholder="e.g. Project tracker"
                      maxLength={100}
                      className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !sheetName.trim()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Create sheet
                  </button>
                </form>
              )}

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-zinc-900">Workspace items</h2>
                  <span className="text-xs text-zinc-500">
                    {selectedWorkspace.sheets?.length ?? 0} {selectedWorkspace.sheets?.length === 1 ? 'sheet' : 'sheets'}
                  </span>
                </div>

                {selectedWorkspace.sheets?.length ? (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="w-full min-w-[520px] border-collapse text-left">
                      <thead className="bg-zinc-100 text-xs font-semibold text-zinc-600">
                        <tr>
                          <th scope="col" className="px-4 py-3">Name</th>
                          <th scope="col" className="px-4 py-3">Owner</th>
                          <th scope="col" className="px-4 py-3">Last updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {selectedWorkspace.sheets.map((sheet) => (
                          <tr
                            key={sheet.id}
                            onClick={() => navigate(`/workspaces/${selectedWorkspace.id}/sheets/${sheet.id}`)}
                            className="cursor-pointer transition hover:bg-zinc-50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                  <FileSpreadsheet className="h-4 w-4" />
                                </span>
                                <span className="truncate text-sm font-medium text-zinc-800">{sheet.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-zinc-600">
                                <UserRound className="h-4 w-4 text-zinc-400" />
                                {user?.name || 'You'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500">
                              {formatDate(sheet.updatedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-5 py-8 text-center">
                    <FileSpreadsheet className="h-6 w-6 text-zinc-400" />
                    <p className="mt-3 text-sm font-medium text-zinc-800">No sheets yet</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">
                      Create a sheet to start organizing information in this workspace.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreatingSheet(true)}
                      className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      <Plus className="h-4 w-4" />
                      Create sheet
                    </button>
                  </div>
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="flex min-h-[480px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <BriefcaseBusiness className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-lg font-semibold text-zinc-900">
              {workspaces.length ? 'Choose a workspace' : 'Create your first workspace'}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {workspaces.length
                ? 'Select a workspace from Browse to view its sheets and details.'
                : 'Workspaces keep related sheets together so your work is easy to browse.'}
            </p>
            {!workspaces.length && (
              <button
                type="button"
                onClick={() => setIsCreatingWorkspace(true)}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
                Create workspace
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
