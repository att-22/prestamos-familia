import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { AtSign, Mail, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAddAllowedEmail, useAdminSettings, useAllowedEmails, useRemoveAllowedEmail } from '@/hooks/useApi';
import type { AllowedEmail } from '@/types/api';

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    // Los errores de validación llegan como lista; el mensaje útil va tras "Value error, "
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg.replace(/^Value error, /, '');
  }
  return 'No se ha podido guardar. Inténtalo de nuevo.';
}

export function AdminPage() {
  const { data: entries = [], isLoading } = useAllowedEmails();
  const { data: settings } = useAdminSettings();
  const addMutation = useAddAllowedEmail();
  const removeMutation = useRemoveAllowedEmail();
  const [entry, setEntry] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    try {
      await addMutation.mutateAsync(entry);
      setEntry('');
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  const handleRemove = async (item: AllowedEmail) => {
    const warning = item.registered
      ? `¿Quitar ${item.entry} de la lista? Su cuenta seguirá funcionando; solo afecta a nuevos registros.`
      : `¿Quitar ${item.entry} de la lista? Ya no podrá crear una cuenta.`;
    if (item.id && confirm(warning)) {
      await removeMutation.mutateAsync(item.id);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="text-gray-600">Decide quién puede crear una cuenta en la aplicación</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Cómo invitar a alguien</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>1. Añade su email a la lista de abajo.</p>
          {settings?.registration_code ? (
            <p>
              2. Dale este código de invitación; se lo pedirá la pantalla de registro:{' '}
              <code className="rounded bg-gray-100 px-2 py-1 font-mono text-gray-900" data-testid="registration-code">
                {settings.registration_code}
              </code>
            </p>
          ) : (
            <p>
              2. Ahora mismo no hay código de invitación configurado, así que le basta con su email.
              Para exigir uno, define <code className="font-mono">REGISTRATION_CODE</code> en la configuración del servidor.
            </p>
          )}
          <p>3. Esa persona entra en la aplicación, pulsa «Crea tu cuenta» y elige su contraseña.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Correos autorizados</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start" noValidate>
            <Input
              label="Email o dominio"
              placeholder="persona@gmail.com"
              helperText="Para autorizar a todo un dominio escribe, por ejemplo, @miempresa.com"
              value={entry}
              onChange={event => setEntry(event.target.value)}
              error={formError ?? undefined}
              autoComplete="off"
            />
            <Button type="submit" className="sm:mt-6" loading={addMutation.isPending} disabled={!entry.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Autorizar
            </Button>
          </form>

          {isLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no hay nadie autorizado.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {entries.map(item => (
                <EntryRow key={`${item.source}-${item.entry}`} item={item} onRemove={handleRemove} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EntryRow({ item, onRemove }: { item: AllowedEmail; onRemove: (item: AllowedEmail) => void }) {
  const Icon = item.is_domain ? AtSign : Mail;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
        <span className="truncate font-medium text-gray-900">{item.entry}</span>
      </div>
      <div className="flex items-center gap-2">
        {item.is_domain ? (
          <Badge variant="info">Todo el dominio</Badge>
        ) : item.registered ? (
          <Badge variant="success">Cuenta creada</Badge>
        ) : (
          <Badge variant="warning">Pendiente de registrarse</Badge>
        )}
        {item.source === 'config' ? (
          <Badge variant="neutral">Fijado en la configuración</Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onRemove(item)} aria-label={`Quitar ${item.entry}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
