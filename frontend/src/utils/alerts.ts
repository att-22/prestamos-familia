import { formatCurrency } from '@/utils/format';
import type { Alert, AlertParam } from '@/types/api';

function formatParam({ value, kind }: AlertParam): string {
  if (kind === 'currency') return formatCurrency(value);

  const num = parseFloat(value);
  if (isNaN(num)) return value;
  // Sin ceros de relleno: "7,2%" y "40%", no "7,20%" ni "40,0%"
  const text = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(num);
  return kind === 'percent' ? `${text}%` : text;
}

/** Texto de una alerta con sus cifras escritas en formato español. */
export function alertText(alert: Alert): string {
  const params = alert.params ?? {};
  return alert.message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? formatParam(params[name]) : placeholder,
  );
}
