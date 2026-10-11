import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { Wallet } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

const MIN_PASSWORD_LENGTH = 10;

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});

const registerSchema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Al menos ${MIN_PASSWORD_LENGTH} caracteres`),
    repeatPassword: z.string(),
    registrationCode: z.string(),
  })
  .refine(data => data.password === data.repeatPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['repeatPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const demoUsers = [
  { label: 'Padre', email: 'padre@familia.com' },
  { label: 'Madre', email: 'madre@familia.com' },
  { label: 'Hijo', email: 'hijo@familia.com' },
  { label: 'Tío', email: 'tio@familia.com' },
];

/** El backend ya devuelve un mensaje pensado para mostrarse; si no hay respuesta, es que no se llegó a él. */
function errorMessage(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.detail === 'string') {
    return error.response.data.detail;
  }
  return 'No se ha podido conectar con el servidor. Inténtalo de nuevo en unos segundos.';
}

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { devLogin } = useAuth();

  const run = async (action: () => Promise<void>) => {
    setIsLoading(true);
    setFormError(null);
    try {
      await action();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'register') => {
    setFormError(null);
    setMode(next);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary-600 mb-4">
            <Wallet className="h-8 w-8" />
            <span>Préstamos Familia</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
          <p className="text-gray-600 mt-1">
            {mode === 'login'
              ? 'Entra para ver tus compras y comparativas'
              : 'Solo pueden registrarse los emails autorizados'}
          </p>
        </CardHeader>
        <CardContent>
          {mode === 'login' ? (
            <LoginForm isLoading={isLoading} run={run} />
          ) : (
            <RegisterForm isLoading={isLoading} run={run} />
          )}

          {formError && (
            <p className="mt-4 text-sm text-danger-600" role="alert">{formError}</p>
          )}

          <p className="mt-6 text-sm text-center text-gray-600">
            {mode === 'login' ? '¿Es tu primera vez?' : '¿Ya tienes cuenta?'}{' '}
            <button
              type="button"
              className="font-medium text-primary-600 hover:underline"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Crea tu cuenta' : 'Inicia sesión'}
            </button>
          </p>

          {import.meta.env.DEV && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center mb-3">Accesos rápidos (solo desarrollo)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {demoUsers.map(({ label, email }) => (
                  <Button key={email} variant="outline" size="sm" disabled={isLoading} onClick={() => run(() => devLogin(email))}>
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

interface FormProps {
  isLoading: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
}

function LoginForm({ isLoading, run }: FormProps) {
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <form onSubmit={handleSubmit(data => run(() => login(data.email, data.password)))} className="space-y-4" noValidate>
      <Input
        {...register('email')}
        label="Email"
        type="email"
        placeholder="tu@email.com"
        error={errors.email?.message}
        autoComplete="email"
        autoFocus
      />
      <Input
        {...register('password')}
        label="Contraseña"
        type="password"
        error={errors.password?.message}
        autoComplete="current-password"
      />
      <Button type="submit" className="w-full" size="lg" loading={isLoading}>
        Entrar
      </Button>
    </form>
  );
}

function RegisterForm({ isLoading, run }: FormProps) {
  const { register: registerUser } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', repeatPassword: '', registrationCode: '' },
  });

  const onSubmit = (data: RegisterFormData) =>
    run(() => registerUser({ email: data.email, password: data.password, registration_code: data.registrationCode }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        {...register('email')}
        label="Email"
        type="email"
        placeholder="tu@email.com"
        error={errors.email?.message}
        autoComplete="email"
        autoFocus
      />
      <Input
        {...register('password')}
        label="Contraseña"
        type="password"
        helperText={`Al menos ${MIN_PASSWORD_LENGTH} caracteres. Una frase fácil de recordar funciona bien.`}
        error={errors.password?.message}
        autoComplete="new-password"
      />
      <Input
        {...register('repeatPassword')}
        label="Repite la contraseña"
        type="password"
        error={errors.repeatPassword?.message}
        autoComplete="new-password"
      />
      <Input
        {...register('registrationCode')}
        label="Código de invitación"
        helperText="Te lo da quien administra la aplicación."
        error={errors.registrationCode?.message}
        autoComplete="off"
      />
      <Button type="submit" className="w-full" size="lg" loading={isLoading}>
        Crear cuenta
      </Button>
    </form>
  );
}
