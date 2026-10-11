import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Car } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary-600 mb-4">
            <Car className="h-8 w-8" />
            <span>Préstamos Familia</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="text-gray-600 mt-1">Enter your email to access your comparisons</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              {...register('email')}
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              autoComplete="email"
              autoFocus
            />
            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              Continue with magic link
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-3">Development shortcuts</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" size="sm" onClick={() => login('padre@familia.com')}>
                Padre (demo)
              </Button>
              <Button variant="outline" size="sm" onClick={() => login('madre@familia.com')}>
                Madre (demo)
              </Button>
              <Button variant="outline" size="sm" onClick={() => login('hijo@familia.com')}>
                Hijo (demo)
              </Button>
              <Button variant="outline" size="sm" onClick={() => login('tio@familia.com')}>
                Tío (demo)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
