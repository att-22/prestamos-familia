import { useParams, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ComparisonResult } from '@/components/comparison/ComparisonResult';
import { PrintButton, PrintHeader } from '@/components/comparison/PrintButton';
import { ShareButton } from '@/components/comparison/ShareButton';
import { WhatIfSimulator } from '@/components/comparison/WhatIfSimulator';
import { formatDate } from '@/utils/format';
import { usePurchase, useFinancingOffer, useComparisonPreview, useCreateComparison } from '@/hooks/useApi';
import type { Comparison, ComparisonCreate } from '@/types/api';

export function ComparisonPage() {
  const { purchaseId, offerId } = useParams();
  const navigate = useNavigate();
  const { data: purchase } = usePurchase(purchaseId!);
  const { data: offer } = useFinancingOffer(offerId!);

  // Lo que hay escrito en el formulario vs. lo que ya se ha aplicado al cálculo
  const [income, setIncome] = useState('');
  const [savings, setSavings] = useState('');
  const [context, setContext] = useState<{ income?: string; savings?: string }>({});
  const [saved, setSaved] = useState<Comparison | null>(null);

  const request: ComparisonCreate = {
    purchase_id: purchaseId!,
    financing_offer_id: offerId!,
    user_monthly_income: context.income,
    user_available_savings: context.savings,
  };

  const { data: result, isLoading, isError, isFetching } = useComparisonPreview(request);
  const saveMutation = useCreateComparison();

  const handleApplyContext = (event: FormEvent) => {
    event.preventDefault();
    setContext({ income: income || undefined, savings: savings || undefined });
    setSaved(null);
  };

  const handleSave = async () => {
    setSaved(await saveMutation.mutateAsync(request));
  };

  return (
    <div className="space-y-6">
      <PrintHeader date={formatDate(new Date().toISOString())} />
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" className="print:hidden" onClick={() => navigate(`/purchases/${purchaseId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{purchase?.name ?? 'Comparativa'}</h1>
          <p className="text-gray-600">
            Pagar al contado frente a financiar{offer ? ` con ${offer.source_name}` : ''}
          </p>
        </div>
        {result && <PrintButton />}
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Tu situación (opcional)</h2>
          <p className="text-sm text-gray-600 mt-1">
            Con estos datos te avisamos si la cuota es demasiado alta para tus ingresos o si la entrada te deja sin colchón.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApplyContext} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Input
              label="Ingresos netos al mes (€)"
              type="number"
              min="0"
              step="0.01"
              placeholder="2200"
              value={income}
              onChange={e => setIncome(e.target.value)}
            />
            <Input
              label="Ahorros disponibles (€)"
              type="number"
              min="0"
              step="0.01"
              placeholder="9000"
              value={savings}
              onChange={e => setSavings(e.target.value)}
            />
            <Button type="submit" variant="secondary" loading={isFetching && !isLoading}>
              Actualizar análisis
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      ) : isError || !result ? (
        <Card>
          <CardContent className="py-12 text-center text-danger-600">
            No se ha podido calcular la comparativa. Comprueba que la compra y la oferta siguen existiendo.
          </CardContent>
        </Card>
      ) : (
        <>
          <ComparisonResult result={result} sourceName={offer?.source_name} />

          {/* El simulador y el guardado son para usar en pantalla: no van al PDF */}
          <div className="print:hidden">
            <WhatIfSimulator purchaseId={purchaseId!} offerId={offerId!} result={result} />
          </div>

          <Card className="print:hidden">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Guardar y compartir</h2>
              <p className="text-sm text-gray-600 mt-1">
                Al guardar se crea un enlace que puedes enviar a la familia. Quien lo abra verá el análisis, pero no tus ingresos ni tus ahorros.
                El enlace muestra la oferta tal como es ahora: si la cambias más adelante, guarda una comparativa nueva.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {saved ? (
                <ShareButton slug={saved.shared_slug} purchaseName={purchase?.name ?? 'Comparativa'} />
              ) : (
                <Button onClick={handleSave} loading={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar comparativa
                </Button>
              )}
              {saveMutation.isError && (
                <p className="text-sm text-danger-600" role="alert">No se ha podido guardar. Inténtalo de nuevo.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
