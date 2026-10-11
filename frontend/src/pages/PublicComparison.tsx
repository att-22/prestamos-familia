import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatPercent, formatDate } from '@/utils/format';
import { usePublicComparison } from '@/hooks/useApi';
import { AlertsPanel } from '@/components/comparison/AlertsPanel';
import { ComparisonSummary } from '@/components/comparison/ComparisonResult';
import { ShareButton } from '@/components/comparison/ShareButton';

export function PublicComparison() {
  const { slug } = useParams();
  const { data: comparison, isLoading, error } = usePublicComparison(slug!);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="animate-pulse"><CardContent className="h-96" /></Card>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Comparativa no encontrada</h1>
        <p className="text-gray-600 mb-6">Este enlace no existe o la comparativa se ha borrado.</p>
        <Link to="/" className="text-primary-600 font-medium hover:underline">Ir al inicio</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">{comparison.purchase_name}</h1>
        <p className="text-gray-600 mt-1">Comparativa compartida • {formatDate(comparison.created_at)}</p>
      </div>

      <ComparisonSummary
        priceCash={comparison.price_cash}
        totalFinancingCost={comparison.total_financing_cost}
        totalInterestFees={comparison.total_interest_fees}
        savingsVsCash={comparison.savings_vs_cash}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Datos de la oferta</h2>
            <Badge variant="info">{comparison.source_name}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 text-sm">
            <div>
              <p className="text-gray-500">Entrada</p>
              <p className="font-medium">{formatCurrency(comparison.down_payment)}</p>
            </div>
            <div>
              <p className="text-gray-500">Cuota mensual</p>
              <p className="font-medium">{formatCurrency(comparison.monthly_payment)}</p>
            </div>
            <div>
              <p className="text-gray-500">Plazo</p>
              <p className="font-medium">{comparison.months} meses</p>
            </div>
            {comparison.residual_value !== null && (
              <div>
                <p className="text-gray-500">Cuota final</p>
                <p className="font-medium">{formatCurrency(comparison.residual_value)}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">TIN</p>
              <p className="font-medium">{formatPercent(comparison.tin)}</p>
            </div>
            <div>
              <p className="text-gray-500">TAE</p>
              <p className="font-medium">{formatPercent(comparison.tae)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertsPanel alerts={comparison.alerts} />

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Compartir esta comparativa</h3>
        </CardHeader>
        <CardContent>
          <ShareButton slug={slug!} purchaseName={comparison.purchase_name} />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-gray-500 border-t border-gray-200 pt-6">
        No es asesoramiento financiero. Consulta a un profesional antes de firmar.
      </p>
    </div>
  );
}
