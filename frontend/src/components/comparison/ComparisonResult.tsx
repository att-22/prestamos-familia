import { formatCurrency, formatPercent } from '@/utils/format';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { AlertsPanel } from '@/components/comparison/AlertsPanel';
import type { ComparisonResult as ComparisonResultData } from '@/types/api';

interface ComparisonResultProps {
  result: ComparisonResultData;
  showDetails?: boolean;
}

export function ComparisonResult({ result, showDetails = true }: ComparisonResultProps) {
  return (
    <div className="space-y-6">
      <ComparisonSummary
        priceCash={result.price_cash}
        totalLeasingCost={result.total_leasing_cost}
        totalInterestFees={result.total_interest_fees}
        savingsVsCash={result.savings_vs_cash}
      />

      {/* Desglose */}
      {showDetails && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Desglose de la financiación</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Entrada inicial</span>
                <span className="font-medium">{formatCurrency(result.down_payment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total cuotas ({result.months} meses)</span>
                <span className="font-medium">{formatCurrency(result.total_payments)}</span>
              </div>
              {result.residual_value !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cuota final para quedarte el coche</span>
                  <span className="font-medium">{formatCurrency(result.residual_value)}</span>
                </div>
              )}
              {parseFloat(result.total_insurance) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Seguros obligatorios</span>
                  <span className="font-medium">{formatCurrency(result.total_insurance)}</span>
                </div>
              )}
              {parseFloat(result.total_fees) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Comisiones</span>
                  <span className="font-medium">{formatCurrency(result.total_fees)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">TOTAL FINANCIADO</span>
                <span className="font-bold text-lg text-gray-900">{formatCurrency(result.total_leasing_cost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalles financieros */}
      {showDetails && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Detalles financieros</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Detail
                label="Importe financiado"
                help="Precio del coche menos la entrada. Es el capital sobre el que se calculan intereses."
                value={formatCurrency(result.financed_amount)}
              />
              <Detail
                label="TAE efectiva"
                help="TAE real calculada con las cuotas, la cuota final y la comisión de apertura que has introducido. Puede diferir de la TAE declarada."
                value={formatPercent(result.effective_annual_rate)}
              />
              <Detail
                label="TAE declarada"
                help="TAE que informa la entidad. Debe coincidir aproximadamente con la efectiva."
                value={formatPercent(result.tae)}
              />
              <Detail
                label="TIN"
                help="Tipo de interés nominal. No incluye comisiones ni seguros."
                value={formatPercent(result.tin)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contexto usuario */}
      {showDetails && (result.monthly_income_percent !== null || result.savings_after_down_payment !== null) && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Tu situación</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {result.monthly_income_percent !== null && (
                <div>
                  <p className="text-sm text-gray-500">Cuota / Ingresos mensuales</p>
                  <p className="font-semibold">{formatPercent(result.monthly_income_percent)}</p>
                  <p className="text-xs text-gray-500 mt-1">Recomendación: menos del 30%</p>
                </div>
              )}
              {result.savings_after_down_payment !== null && (
                <div>
                  <p className="text-sm text-gray-500">Ahorros tras la entrada</p>
                  <p className={`font-semibold ${parseFloat(result.savings_after_down_payment) < 3000 ? 'text-danger-600' : 'text-success-600'}`}>
                    {formatCurrency(result.savings_after_down_payment)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Recomendación: más de 3.000 € de colchón</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertsPanel alerts={result.alerts} />
    </div>
  );
}

interface ComparisonSummaryProps {
  priceCash: string;
  totalLeasingCost: string;
  totalInterestFees: string;
  savingsVsCash: string;
}

export function ComparisonSummary({ priceCash, totalLeasingCost, totalInterestFees, savingsVsCash }: ComparisonSummaryProps) {
  // savings_vs_cash = contado - financiado: negativo cuando financiar sale más caro
  const extraCost = -parseFloat(savingsVsCash);
  const financingCostsMore = extraCost > 0;

  return (
    <Card variant="elevated">
      <CardContent className="px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Precio al contado</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(priceCash)}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total financiando</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalLeasingCost)}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Intereses, comisiones y seguros</p>
            <p className="text-2xl font-bold text-danger-600">{formatCurrency(totalInterestFees)}</p>
          </div>
          <div className={`text-center p-4 rounded-lg ${financingCostsMore ? 'bg-danger-50' : 'bg-success-50'}`}>
            <p className="text-sm text-gray-500">{financingCostsMore ? 'Financiar te cuesta de más' : 'Financiar te ahorra'}</p>
            <p className={`text-2xl font-bold ${financingCostsMore ? 'text-danger-600' : 'text-success-600'}`}>
              {formatCurrency(Math.abs(extraCost))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, help, value }: { label: string; help: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-500">
        <InfoTooltip label={label} content={help} />
      </div>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
