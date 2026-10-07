import { useAuthStore } from '../stores/auth.store';

export function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">
        Hi {user?.name}! Nice to meet you
      </h1>
    </div>
  );
}
