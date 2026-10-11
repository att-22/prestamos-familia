import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { Alert, AlertType } from '@/types/api';

interface AlertsPanelProps {
  alerts: Alert[];
  title?: string;
}

const styles: Record<AlertType, { container: string; icon: typeof Info }> = {
  error: { container: 'bg-danger-50 text-danger-600 border-danger-500', icon: XCircle },
  warning: { container: 'bg-warning-50 text-warning-600 border-warning-500', icon: AlertTriangle },
  info: { container: 'bg-primary-50 text-primary-700 border-primary-200', icon: Info },
  success: { container: 'bg-success-50 text-success-600 border-success-500', icon: CheckCircle2 },
};

// Lo más grave primero: es lo que hay que leer antes de firmar
const severity: AlertType[] = ['error', 'warning', 'info', 'success'];

export function AlertsPanel({ alerts, title = 'Análisis y alertas' }: AlertsPanelProps) {
  if (alerts.length === 0) return null;

  const sorted = [...alerts].sort((a, b) => severity.indexOf(a.type) - severity.indexOf(b.type));

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sorted.map(alert => (
            <AlertItem key={alert.code} alert={alert} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const { container, icon: Icon } = styles[alert.type] ?? styles.info;

  return (
    <li className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${container}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{alert.message}</span>
    </li>
  );
}
