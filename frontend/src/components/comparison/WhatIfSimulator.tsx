import { useEffect, useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useScenario } from '@/hooks/useApi';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { ComparisonResult } from '@/types/api';

interface WhatIfSimulatorProps {
  purchaseId: string;
  offerId: string;
  result: ComparisonResult;
}

const MAX_MONTHS = 120;

/** Espera a que el valor deje de cambiar: no se pide un cálculo por cada píxel del deslizador. */
function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function stepFor(original: number, preferred: number): number {
  return original % preferred === 0 ? preferred : 1;
}

function signed(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
  return `${sign}${formatCurrency(Math.abs(amount))}`;
}

/** Qué pasaría con la misma oferta dando más entrada o cambiando el plazo. */
export function WhatIfSimulator({ purchaseId, offerId, result }: WhatIfSimulatorProps) {
  const downPaymentId = useId();
  const monthsId = useId();

  const originalDownPayment = parseFloat(result.down_payment);
  const originalMonths = result.months;
  const price = parseFloat(result.price_cash);
  const maxDownPayment = Math.floor(price - parseFloat(result.residual_value ?? '0'));
  const downPaymentStep = stepFor(originalDownPayment, price >= 5000 ? 100 : price >= 1000 ? 50 : 10);
  const monthsStep = stepFor(originalMonths, 6);

  const [downPayment, setDownPayment] = useState(originalDownPayment);
  const [months, setMonths] = useState(originalMonths);

  const changed = downPayment !== originalDownPayment || months !== originalMonths;
  const request = useDebounced({ downPayment, months });
  const { data: scenario, isError } = useScenario(
    { purchase_id: purchaseId, financing_offer_id: offerId, down_payment: request.downPayment.toFixed(2), months: request.months },
    request.downPayment !== originalDownPayment || request.months !== originalMonths,
  );
  // Mientras llega el cálculo de los valores nuevos se sigue viendo el anterior
  const shown = changed ? scenario : undefined;

  const paymentDiff = shown ? parseFloat(shown.monthly_payment) - parseFloat(result.monthly_payment) : 0;
  const costDiff = shown ? parseFloat(shown.total_financing_cost) - parseFloat(result.total_financing_cost) : 0;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">¿Y si…?</h3>
        <p className="text-sm text-gray-600 mt-1">
          Prueba a dar más entrada o a cambiar el plazo y mira cómo cambian la cuota y lo que acabas pagando.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor={downPaymentId} className="flex items-baseline justify-between text-sm font-medium text-gray-700">
              <span>Entrada</span>
              <span className="text-base font-semibold text-gray-900">{formatCurrency(downPayment)}</span>
            </label>
            <input
              id={downPaymentId}
              type="range"
              min={0}
              max={maxDownPayment}
              step={downPaymentStep}
              value={downPayment}
              onChange={event => setDownPayment(Number(event.target.value))}
              className="mt-2 w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatCurrency(0, 0)}</span>
              <span>{formatCurrency(maxDownPayment, 0)}</span>
            </div>
          </div>
          <div>
            <label htmlFor={monthsId} className="flex items-baseline justify-between text-sm font-medium text-gray-700">
              <span>Plazo</span>
              <span className="text-base font-semibold text-gray-900">{months} meses</span>
            </label>
            <input
              id={monthsId}
              type="range"
              min={monthsStep}
              max={MAX_MONTHS}
              step={monthsStep}
              value={months}
              onChange={event => setMonths(Number(event.target.value))}
              className="mt-2 w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{monthsStep} {monthsStep === 1 ? 'mes' : 'meses'}</span>
              <span>{MAX_MONTHS} meses</span>
            </div>
          </div>
        </div>

        {!changed ? (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Ahora ves la oferta tal como es: {formatCurrency(result.monthly_payment)} al mes y {formatCurrency(result.total_financing_cost)} en total.
            Mueve los controles para compararla con otras condiciones.
          </p>
        ) : isError ? (
          <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600" role="alert">
            No se ha podido calcular con esas condiciones.
          </p>
        ) : !shown ? (
          <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <div className="space-y-4" data-testid="scenario">
            <div className="grid gap-4 sm:grid-cols-3">
              <Figure label="Cuota mensual" value={formatCurrency(shown.monthly_payment)} diff={paymentDiff} suffix=" al mes" />
              <Figure label="Coste total" value={formatCurrency(shown.total_financing_cost)} diff={costDiff} />
              <Figure label="De más frente al contado" value={formatCurrency(shown.total_interest_fees)} />
            </div>
            <p className="text-sm text-gray-700">
              {costDiff < 0
                ? `Con estas condiciones acabarías pagando ${formatCurrency(-costDiff)} menos que con la oferta tal como está.`
                : costDiff > 0
                  ? `Con estas condiciones acabarías pagando ${formatCurrency(costDiff)} más que con la oferta tal como está.`
                  : 'Con estas condiciones acabarías pagando lo mismo que con la oferta tal como está.'}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!changed}
            onClick={() => {
              setDownPayment(originalDownPayment);
              setMonths(originalMonths);
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Volver a la oferta
          </Button>
          <p className="text-xs text-gray-500">
            Estimación manteniendo el tipo de interés de la oferta
            {shown ? ` (${formatPercent(shown.annual_rate)} nominal)` : ''}, sus comisiones y su seguro. La entidad puede cambiarlos: pide la cifra exacta.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, diff, suffix = '' }: { label: string; value: string; diff?: number; suffix?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {diff !== undefined && diff !== 0 && (
        <p className={`text-xs font-medium ${diff < 0 ? 'text-success-600' : 'text-danger-600'}`}>
          {signed(diff)}{suffix}
        </p>
      )}
    </div>
  );
}
