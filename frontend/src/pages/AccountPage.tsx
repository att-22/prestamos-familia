import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { authApi } from '@/services/api';
import { formatDate } from '@/utils/format';

export function AccountPage() {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!user) return null;

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '¿Borrar tu cuenta?',
      message:
        'Se borrarán todas tus compras, ofertas y comparativas, y los enlaces que hayas compartido dejarán de funcionar. No se puede deshacer.',
      confirmLabel: 'Borrar mi cuenta',
      danger: true,
    });
    if (!confirmed) return;

    setDeleting(true);
    setFailed(false);
    try {
      await authApi.deleteMe();
      logout();
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi cuenta</h1>
        <p className="text-gray-600">Tus datos en la aplicación</p>
      </div>

      <Card>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">Nombre</dt>
              <dd className="font-medium text-gray-900">{user.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="break-all font-medium text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Cuenta creada el</dt>
              <dd className="font-medium text-gray-900">{formatDate(user.created_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Borrar mi cuenta</h2>
          <p className="text-sm text-gray-600 mt-1">
            Elimina tu cuenta y todo lo que has guardado en ella: compras, ofertas y comparativas. Los enlaces que hayas
            compartido dejarán de funcionar.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            Borrar mi cuenta
          </Button>
          {failed && (
            <p className="text-sm text-danger-600" role="alert">No se ha podido borrar la cuenta. Inténtalo de nuevo.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
