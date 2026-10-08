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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label htmlFor="name" className="mb-2 block text-[13px] font-semibold text-zinc-800">Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          {...register('name')}
          disabled={isLoading}
          autoFocus
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email" className="mb-2 block text-[13px] font-semibold text-zinc-800">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password" className="mb-2 block text-[13px] font-semibold text-zinc-800">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Create a password"
          {...register('password')}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  );
}
