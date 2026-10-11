import { formatCurrency, formatPercent } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/ui/Tooltip';
import type { ComparisonResult, Alert } from '@/types/api';

interface ComparisonResultProps {
  result: ComparisonResult;
  showDetails?: boolean;
}

export function ComparisonResult({ result, showDetails = true }: ComparisonResultProps) {
  const savings = parseFloat(result.savings_vs_cash);
  const isSaving = savings > 0;

  return (
    <div className="space-y-6">
      {/* Resumen principal */}
      <Card variant="elevated">
        <CardContent className="px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Precio contado</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.price_cash)}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total leasing</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.total_leasing_cost)}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Intereses + comisiones</p>
              <p className="text-2xl font-bold text-danger-600">{formatCurrency(result.total_interest_fees)}</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${isSaving ? 'bg-success-50' : 'bg-danger-50'}`}>
              <p className="text-sm text-gray-500">{isSaving ? 'Ahorras pagando contado' : 'Coste extra leasing'}</p>
              <p className={`text-2xl font-bold ${isSaving ? 'text-success-600' : 'text-danger-600'}`}>
                {formatCurrency(Math.abs(savings))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desglose */}
      {showDetails && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Desglose del leasing</h3>
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
                <span className="font-semibold text-gray-900">TOTAL LEASING</span>
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
              <InfoTooltip
                label="Importe financiado"
                content="Precio del coche menos la entrada. Es el capital sobre el que se calculan intereses."
              >
                <div>
                  <p className="text-sm text-gray-500">Importe financiado</p>
                  <p className="font-semibold">{formatCurrency(result.financed_amount)}</p>
                </div>
              </InfoTooltip>
              <InfoTooltip
                label="TAE efectiva"
                content="TAE real calculada según los flujos de caja reales (incluye comisión apertura). Puede diferir de la TAE declarada."
              >
                <div>
                  <p className="text-sm text-gray-500">TAE efectiva</p>
                  <p className="font-semibold">{formatPercent(result.effective_annual_rate)}</p>
                </div>
              </InfoTooltip>
              <InfoTooltip
                label="TAE declarada"
                content="TAE que informa la entidad. Debe coincidir aproximadamente con la efectiva."
              >
                <div>
                  <p className="text-sm text-gray-500">TAE declarada</p>
                  <p className="font-semibold">{formatPercent(result.tae)}</p>
                </div>
              </InfoTooltip>
              <InfoTooltip
                label="TIN"
                content="Tipo de interés nominal. No incluye comisiones ni seguros."
              >
                <div>
                  <p className="text-sm text-gray-500">TIN</p>
                  <p className="font-semibold">{formatPercent(result.tin)}</p>
                </div>
              </InfoTooltip>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contexto usuario */}
      {(result.monthly_income_percent || result.savings_after_down_payment !== null) && showDetails && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Tu situación</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {result.monthly_income_percent && (
                <div>
                  <p className="text-sm text-gray-500">Cuota / Ingresos mensuales</p>
                  <p className="font-semibold">{formatPercent(result.monthly_income_percent)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Recomendación: < 30%
                  </p>
                </div>
              )}
              {result.savings_after_down_payment !== null && (
                <div>
                  <p className="text-sm text-gray-500">Ahorros tras entrada</p>
                  <p className={`font-semibold ${parseFloat(result.savings_after_down_payment) < 3000 ? 'text-danger-600' : 'text-success-600'}`}>
                    {formatCurrency(result.savings_after_down_payment)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Recomendación: > 3.000€ colchón
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {result.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Análisis y alertas</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.alerts.map((alert, idx) => (
                <AlertItem key={idx} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const variants = {
    success: 'bg-success-50 text-success-700 border-success-200',
    warning: 'bg-warning-50 text-warning-700 border-warning-200',
    danger: 'bg-danger-50 text-dan
