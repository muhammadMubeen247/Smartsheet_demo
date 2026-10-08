import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LoaderCircle, AlertCircle, FileText } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { Sidebar } from '../components/layout/Sidebar';
import { SheetHeader } from '../components/spreadsheet/SheetHeader';
import { Toolbar } from '../components/spreadsheet/Toolbar';
import { Spreadsheet } from '../components/spreadsheet/Spreadsheet';

function errorMessage(error, fallback) {
  return error.response?.data?.error?.message || fallback;
}

export function SheetView() {
  const { workspaceId, sheetId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [sheet, setSheet] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSheet = useCallback(() => {
    setLoading(true);
    setError('');

    Promise.all([
      api.get(`/sheets/${sheetId}`).catch((err) => { throw new Error(errorMessage(err, 'Unable to load this sheet.')); }),
      api.get(`/sheets/${sheetId}/rows`).catch((err) => { throw new Error(errorMessage(err, 'Unable to load rows.')); }),
    ])
      .then(([sheetRes, rowsRes]) => {
        setSheet(sheetRes.data.data);
        setColumns(sheetRes.data.data.columns?.sort((a, b) => a.position - b.position) || []);
        setRows(rowsRes.data.data || []);
      })
      .catch((err) => {
        setError(err.message || 'Unable to load this sheet.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sheetId]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const handleRename = (updatedSheet) => {
    setSheet(updatedSheet);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-zinc-500">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Loading sheet
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <FileText className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-zinc-900">Unable to open this sheet</h2>
        <p className="mt-2 max-w-md text-sm text-zinc-500">{error}</p>
        <div className="mt-5 flex items-center gap-3">
          <Link to={`/workspaces/${workspaceId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700">
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <Sidebar collapsed />
      
      <main className="ml-[72px] min-h-screen">
        {/* Sheet header bar */}
        <header className="flex h-[56px] items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/workspaces/${workspaceId}`)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              title="Back to workspace"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="truncate text-sm font-semibold text-zinc-900">{sheet?.name}</span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          <SheetHeader sheet={sheet} workspaceId={workspaceId} onRename={handleRename} />

          <div className="mt-6">
            <Toolbar />
          </div>

          <div className="mt-4">
            <Spreadsheet
              sheetId={sheetId}
              columns={columns}
              rows={rows}
              user={user}
              onRename={handleRename}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
