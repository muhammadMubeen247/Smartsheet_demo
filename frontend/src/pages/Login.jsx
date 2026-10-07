import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';
import { AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSuccess = () => {
    setTimeout(() => navigate('/home'), 100);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  };

  return (
    <AuthLayout title="Sign In" description="Welcome back! Please sign in to your account.">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <LoginForm onSuccess={handleSuccess} onError={handleError} />
      
      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
