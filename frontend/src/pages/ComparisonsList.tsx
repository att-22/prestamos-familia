import { Link } from 'react-router-dom';
import { Calculator, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/hooks/useConfirm';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatPercent, formatDate } from '@/utils/format';
import { useComparisons, useDeleteComparison } from '@/hooks/useApi';
import type { Comparison } from '@/types/api';

export function ComparisonsList() {
  const { data: comparisons = [], isLoading } = useComparisons();
  const deleteMutation = useDeleteComparison();
  const confirm = useConfirm();

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Borrar esta comparativa?',
      message: 'El enlace compartido dejará de funcionar.',
      confirmLabel: 'Borrar',
      danger: true,
    });
    if (confirmed) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis comparativas</h1>
        <p className="text-gray-600">Comparativas guardadas y sus enlaces para compartir</p>
      </div>

      {comparisons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay comparativas guardadas</h3>
            <p className="text-gray-600 mb-4">Analiza una oferta desde la página de una compra y guárdala</p>
            <Link to="/dashboard">
              <Button>Ir a mis compras</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comparisons.map(comparison => (
            <ComparisonCard key={comparison.id} comparison={comparison} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonCard({ comparison, onDelete }: { comparison: Comparison; onDelete: (id: string) => void }) {
  const extraCost = -parseFloat(comparison.savings_vs_cash);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-900">
                {comparison.purchase_name ?? 'Comparativa'}
                {comparison.source_name && <span className="font-normal text-gray-500"> · {comparison.source_name}</span>}
              </h3>
              <Badge variant={extraCost > 0 ? 'danger' : 'success'}>
                {extraCost > 0 ? 'Cuesta de más' : 'Ahorra'} {formatCurrency(Math.abs(extraCost))}
              </Badge>
              {comparison.monthly_income_percent !== null && (
                <Badge variant="info">Cuota: {formatPercent(comparison.monthly_income_percent)} de los ingresos</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Guardada el {formatDate(comparison.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/c/${comparison.shared_slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => onDelete(comparison.id)} aria-label="Borrar comparativa">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
