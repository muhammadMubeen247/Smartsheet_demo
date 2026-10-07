# Frontend Authentication Flow Implementation Plan

## Technology Stack
- **Framework:** React 18+ with Vite
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** Zustand
- **Forms:** react-hook-form + zod (validation)
- **HTTP Client:** Axios

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── auth/            # Auth-specific components
│   │   │   ├── LoginForm.jsx
│   │   │   ├── RegisterForm.jsx
│   │   │   └── AuthLayout.jsx
│   │   └── protected-route.jsx
│   ├── lib/
│   │   ├── api.js           # Axios instance with interceptors
│   │   └── utils.js         # Utility functions
│   ├── stores/
│   │   └── auth.store.js    # Zustand auth store
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Dashboard.jsx    # Protected route placeholder
│   ├── schemas/
│   │   └── auth.schemas.js  # Zod validation schemas
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env
```

## Implementation Steps

### Step 1: Initialize React + Vite Project
```bash
cd C:\Techtimize\frontend
npm create vite@latest . -- --template react
npm install
```

### Step 2: Install Dependencies
```bash
# Core dependencies
npm install react-router-dom axios zustand react-hook-form @hookform/resolvers zod

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui dependencies
npm install -D @types/node
npm install @radix-ui/react-label @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
```

### Step 3: Configure Environment Variables
Create `.env`:
```env
VITE_API_URL=http://localhost:3000
```

### Step 4: Setup Tailwind CSS
Configure `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 5: Setup shadcn/ui
Initialize shadcn/ui and install required components:
```bash
npx shadcn@latest init
npx shadcn@latest add button input label card form
```

This creates `src/components/ui/` with Button, Input, Label, Card, and Form components.

### Step 6: Create API Layer (`src/lib/api.js`)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Step 7: Create Zustand Auth Store (`src/stores/auth.store.js`)
```javascript
import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isAuthenticated: false,

  // Initialize auth state on app load
  initAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      set({ isLoading: true });
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Login
  login: async (credentials) => {
    try {
      set({ isLoading: true });
      const { data } = await api.post('/auth/login', credentials);
      const { user, token } = data;
      
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      const errorMessage = error.response?.data?.error?.message || 'Login failed';
      return { success: false, error: errorMessage };
    }
  },

  // Register
  register: async (userData) => {
    try {
      set({ isLoading: true });
      const { data } = await api.post('/auth/register', userData);
      const { user, token } = data;
      
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      const errorMessage = error.response?.data?.error?.message || 'Registration failed';
      return { success: false, error: errorMessage };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
```

### Step 8: Create Validation Schemas (`src/schemas/auth.schemas.js`)
```javascript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
```

### Step 9: Create Protected Route Component (`src/components/protected-route.jsx`)
```javascript
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

### Step 10: Create Auth Layout Component (`src/components/auth/AuthLayout.jsx`)
```javascript
export function AuthLayout({ children, title, description }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Smartsheet Demo</h1>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
```

### Step 11: Create Login Form Component (`src/components/auth/LoginForm.jsx`)
```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../schemas/auth.schemas';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function LoginForm({ onSuccess, onError }) {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      onSuccess?.();
    } else {
      onError?.(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

### Step 12: Create Register Form Component (`src/components/auth/RegisterForm.jsx`)
```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '../../schemas/auth.schemas';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function RegisterForm({ onSuccess, onError }) {
  const registerUser = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    const result = await registerUser(data);
    if (result.success) {
      onSuccess?.();
    } else {
      onError?.(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          {...register('name')}
          disabled={isLoading}
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  );
}
```

### Step 13: Create Login Page (`src/pages/Login.jsx`)
```javascript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';
import { AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSuccess = () => {
    navigate('/dashboard');
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
```

### Step 14: Create Register Page (`src/pages/Register.jsx`)
```javascript
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
      navigate('/dashboard');
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
      
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
```

### Step 15: Create Dashboard Page (`src/pages/Dashboard.jsx`)
```javascript
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
```

### Step 16: Setup App Routing (`src/App.jsx`)
```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth.store';
import { ProtectedRoute } from './components/protected-route';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';

function App() {
  const { initAuth, isLoading } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  if (isLoading) {
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
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### Step 17: Update main.jsx (`src/main.jsx`)
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Step 18: Update Progress.md
Reorganize Progress.md into sprints:
- Sprint 1: Backend MVP (all existing backend work)
- Sprint 2: Frontend Authentication (current work)
- Document completed tasks, in-progress tasks, and pending tasks

### Step 19: Verify Implementation
1. Start backend server: `cd C:\Techtimize\backend && npm start`
2. Start frontend dev server: `cd C:\Techtimize\frontend && npm run dev`
3. Test the following flows:
   - Navigate to `/` → redirects to `/dashboard` → redirects to `/login`
   - Register new user → auto-login → redirects to `/dashboard`
   - Logout → redirects to `/login`
   - Login with existing user → redirects to `/dashboard`
   - Verify JWT token is stored in localStorage
   - Verify `/auth/me` is called on page refresh
   - Verify protected routes redirect to login when not authenticated
   - Test form validation errors
   - Test backend error handling (duplicate email, invalid credentials)

## Files to Create
1. `frontend/src/lib/api.js` - API client with interceptors
2. `frontend/src/stores/auth.store.js` - Zustand auth store
3. `frontend/src/schemas/auth.schemas.js` - Zod validation schemas
4. `frontend/src/components/protected-route.jsx` - Route guard
5. `frontend/src/components/auth/AuthLayout.jsx` - Auth page layout
6. `frontend/src/components/auth/LoginForm.jsx` - Login form
7. `frontend/src/components/auth/RegisterForm.jsx` - Register form
8. `frontend/src/pages/Login.jsx` - Login page
9. `frontend/src/pages/Register.jsx` - Register page
10. `frontend/src/pages/Dashboard.jsx` - Protected dashboard placeholder
11. `frontend/src/App.jsx` - Main app with routing
12. `frontend/src/main.jsx` - App entry point

## Files to Modify
1. `frontend/package.json` - Add dependencies
2. `frontend/vite.config.js` - Configure proxy if needed
3. `frontend/tailwind.config.js` - Tailwind configuration
4. `frontend/src/index.css` - Tailwind directives
5. `frontend/.env` - API URL configuration
6. `C:\Techtimize\Progress.md` - Reorganize into sprints

## Backend Considerations
- No backend changes required
- Frontend will use existing `/auth/register`, `/auth/login`, `/auth/me` endpoints
- Token storage: localStorage (simple, works for this demo)
- CORS should already be configured in backend

## Testing Checklist
- [ ] Register new user successfully
- [ ] Login with existing user
- [ ] Form validation errors display correctly
- [ ] Backend errors display correctly (duplicate email, invalid credentials)
- [ ] JWT token stored in localStorage
- [ ] Protected routes redirect to login when not authenticated
- [ ] `/auth/me` called on page refresh to restore session
- [ ] Logout clears token and redirects to login
- [ ] Loading states prevent duplicate submissions
- [ ] Navigation between login/register works
- [ ] Responsive design on mobile/desktop