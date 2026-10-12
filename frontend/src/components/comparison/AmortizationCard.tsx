import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { Amortization, AmortizationRow } from '@/types/api';

interface AmortizationCardProps {
  amortization: Amortization;
  declaredTin: string;
  residualValue: string | null;
}

interface YearSummary {
  year: number;
  paid: number;
  interest: number;
  principal: number;
  balance: string;
}

function byYear(rows: AmortizationRow[]): YearSummary[] {
  const years: YearSummary[] = [];
  for (const row of rows) {
    const index = Math.ceil(row.month / 12) - 1;
    years[index] ??= { year: index + 1, paid: 0, interest: 0, principal: 0, balance: row.balance };
    years[index].paid += parseFloat(row.payment);
    years[index].interest += parseFloat(row.interest);
    years[index].principal += parseFloat(row.principal);
    years[index].balance = row.balance;
  }
  return years;
}

/** Cómo se reparte cada cuota entre intereses y devolución de lo prestado. */
export function AmortizationCard({ amortization, declaredTin, residualValue }: AmortizationCardProps) {
  const [monthly, setMonthly] = useState(false);
  const { rows } = amortization;
  if (rows.length === 0) return null;

  const hasInterest = parseFloat(amortization.total_interest) > 0;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const rateDiffers = Math.abs(parseFloat(amortization.annual_rate) - parseFloat(declaredTin)) > 0.1;

  return (
    <Card data-testid="amortization">
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">Cuadro de amortización</h3>
        <p className="text-sm text-gray-600 mt-1">
          {hasInterest
            ? `De la primera cuota, ${formatCurrency(first.interest)} son intereses; de la última, ${formatCurrency(last.interest)}. Al principio pagas sobre todo intereses y al final casi todo es devolver lo prestado.`
            : 'Esta financiación no tiene intereses: cada cuota devuelve íntegramente lo prestado.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {hasInterest && <SplitChart rows={rows} />}

        <div className={`overflow-x-auto print:max-h-none print:overflow-visible ${monthly ? 'max-h-96 overflow-y-auto' : ''}`}>
          <table className="w-full text-sm">
            <thead className={monthly ? 'sticky top-0 bg-white' : undefined}>
              <tr className="border-b border-gray-200 text-gray-500">
                <th scope="col" className="py-2 pr-2 sm:pr-3 text-left font-medium">{monthly ? 'Mes' : 'Año'}</th>
                <th scope="col" className="hidden py-2 px-2 sm:px-3 text-right font-medium sm:table-cell">Pagado</th>
                <th scope="col" className="py-2 px-2 sm:px-3 text-right font-medium">Intereses</th>
                <th scope="col" className="py-2 px-2 sm:px-3 text-right font-medium">Capital</th>
                <th scope="col" className="py-2 pl-2 sm:pl-3 text-right font-medium">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthly
                ? rows.map(row => (
                    <ScheduleRow key={row.month} label={row.month} paid={row.payment} interest={row.interest} principal={row.principal} balance={row.balance} />
                  ))
                : byYear(rows).map(year => (
                    <ScheduleRow key={year.year} label={year.year} paid={year.paid} interest={year.interest} principal={year.principal} balance={year.balance} />
                  ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-semibold text-gray-900">
                <th scope="row" className="py-2 pr-2 sm:pr-3 text-left">Total</th>
                <td className="hidden py-2 px-2 sm:px-3 text-right sm:table-cell">{formatCurrency(rows.reduce((sum, row) => sum + parseFloat(row.payment), 0))}</td>
                <td className="py-2 px-2 sm:px-3 text-right">{formatCurrency(amortization.total_interest)}</td>
                <td className="py-2 px-2 sm:px-3 text-right">{formatCurrency(rows.reduce((sum, row) => sum + parseFloat(row.principal), 0))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" className="print:hidden" onClick={() => setMonthly(!monthly)}>
            {monthly ? 'Ver por años' : 'Ver mes a mes'}
          </Button>
          <p className="text-xs text-gray-500">
            Calculado con el tipo que resulta de tus cuotas: {formatPercent(amortization.annual_rate)} nominal anual
            {rateDiffers ? ` (el TIN declarado es ${formatPercent(declaredTin)})` : ''}.
            {residualValue !== null && ` Lo pendiente al final es la cuota final de ${formatCurrency(residualValue)}.`}
            {' '}No incluye comisiones ni seguros.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleRow({ label, paid, interest, principal, balance }: {
  label: number;
  paid: string | number;
  interest: string | number;
  principal: string | number;
  balance: string;
}) {
  return (
    <tr>
      <th scope="row" className="py-2 pr-2 sm:pr-3 text-left font-medium text-gray-900">{label}</th>
      {/* En móvil sobra: es la cuota, igual todos los meses */}
      <td className="hidden py-2 px-2 sm:px-3 text-right sm:table-cell">{formatCurrency(paid)}</td>
      <td className="py-2 px-2 sm:px-3 text-right text-warning-600">{formatCurrency(interest)}</td>
      <td className="py-2 px-2 sm:px-3 text-right text-primary-700">{formatCurrency(principal)}</td>
      <td className="py-2 pl-2 sm:pl-3 text-right text-gray-600">{formatCurrency(balance)}</td>
    </tr>
  );
}

/** Una barra por cuota: abajo lo que devuelve capital, arriba lo que se va en intereses. */
function SplitChart({ rows }: { rows: AmortizationRow[] }) {
  const height = 120;
  const max = Math.max(...rows.map(row => parseFloat(row.payment)), 1);
  const gap = rows.length > 60 ? 0.1 : 0.2;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${rows.length} ${height}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        role="img"
        aria-label="Reparto de cada cuota entre intereses y capital, mes a mes"
      >
        {rows.map((row, index) => {
          // Si la cuota no cubre los intereses el capital sale negativo: se dibuja solo el interés
          const principal = Math.max(parseFloat(row.principal), 0) / max * height;
          const interest = Math.max(parseFloat(row.interest), 0) / max * height;
          return (
            <g key={row.month}>
              <rect x={index + gap / 2} y={height - principal} width={1 - gap} height={principal} className="fill-primary-500" />
              <rect x={index + gap / 2} y={height - principal - interest} width={1 - gap} height={interest} className="fill-warning-500" />
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>Cuota 1</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-xs bg-warning-500" aria-hidden="true" />Intereses</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-xs bg-primary-500" aria-hidden="true" />Capital</span>
        </span>
        <span>Cuota {rows.length}</span>
      </figcaption>
    </figure>
  );
}
