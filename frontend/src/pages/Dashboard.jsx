import { useAuthStore } from '../stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { LogOut } from 'lucide-react';

export function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user?.name}!</h2>
          <p className="text-gray-600">Email: {user?.email}</p>
          <p className="text-gray-600 mt-2">
            Member since: {new Date(user?.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Authentication Successful</h3>
          <p className="text-blue-800">
            You are now logged in. This page is protected and only accessible to authenticated users.
          </p>
        </div>
      </main>
    </div>
  );
}
