import { useState } from 'react';
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

const demoUsers = [
  { label: 'Padre', email: 'padre@familia.com' },
  { label: 'Madre', email: 'madre@familia.com' },
  { label: 'Hijo', email: 'hijo@familia.com' },
  { label: 'Tío', email: 'tio@familia.com' },
];

export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  });

  const handleLogin = async (email: string) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      await login(email);
    } catch {
      setLoginError('No se ha podido iniciar sesión. Comprueba que el servidor está en marcha e inténtalo de nuevo.');
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
          <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
          <p className="text-gray-600 mt-1">Introduce tu email para ver tus comparativas</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(data => handleLogin(data.email))} className="space-y-4">
            <Input
              {...register('email')}
              label="Email"
              type="email"
              placeholder="tu@email.com"
              error={errors.email?.message}
              autoComplete="email"
              autoFocus
            />
            {loginError && (
              <p className="text-sm text-danger-600" role="alert">{loginError}</p>
            )}
            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              Entrar
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center mb-3">Accesos rápidos (solo desarrollo)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {demoUsers.map(({ label, email }) => (
                  <Button key={email} variant="outline" size="sm" disabled={isLoading} onClick={() => handleLogin(email)}>
                    {label} (demo)
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
