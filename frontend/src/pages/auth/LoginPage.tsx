import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { loginSchema } from '../../schemas/auth';
import { useAuthStore } from '../../store/authStore';
import { routes } from '../../constants/routes';

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  const { register, handleSubmit } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: any) => {
    setUser({ id: '1', name: 'Demo User', email: values.email, role: 'admin' });
    setToken('demo-token');
    navigate(routes.dashboard);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <p className="text-sm text-slate-400">This is the authentication foundation layer for the SaaS workspace.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input placeholder="Email" type="email" {...register('email')} />
            <Input placeholder="Password" type="password" {...register('password')} />
            <Button className="w-full" type="submit">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
