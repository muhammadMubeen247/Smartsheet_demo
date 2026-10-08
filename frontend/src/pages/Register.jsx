import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      navigate('/home', { replace: true });
    }, 1500);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  };

  return (
    <AuthLayout title="Create Account" description="Get started with your free account.">
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">Account created successfully! Redirecting...</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <RegisterForm onSuccess={handleSuccess} onError={handleError} />
      
      <p className="mt-7 text-center text-sm text-zinc-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-red-600 transition hover:text-red-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
