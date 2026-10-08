import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth.store';
import { ProtectedRoute } from './components/protected-route';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Workspaces } from './pages/Workspaces';
import { SheetView } from './pages/SheetView';

function App() {
  const { initAuth, isInitializing } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Dashboard />} />
          <Route path="workspaces" element={<Workspaces />} />
          <Route path="workspaces/:workspaceId" element={<Workspaces />} />
        </Route>
        <Route
          path="/workspaces/:workspaceId/sheets/:sheetId"
          element={
            <ProtectedRoute>
              <SheetView />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
