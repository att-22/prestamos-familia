import { useParams } from 'react-router-dom';
import { ExternalLink, Calculator, Share2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatPercent, formatDate } from '@/utils/format';
import { usePublicComparison } from '@/hooks/useApi';
import { AlertsPanel } from '@/components/comparison/AlertsPanel';
import { ShareButton } from '@/components/comparison/ShareButton';
import { PublicLayout } from '@/components/layout/Layout';

export function PublicComparison() {
  const { slug } = useParams();
  const { data: comparison, isLoading, error } = usePublicComparison(slug!);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto">
          <Card className="animate-pulse"><CardContent className="h-96" /></Card>
        </div>
      </PublicLayout>
    );
  }

  if (error || !comparison) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Comparison Not Found</h1>
          <p className="text-gray-600 mb-6">This comparison doesn't exist or is not public.</p>
          <Button variant="primary" asChild>
            <a href="/">Go Home</a>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const savings = parseFloat(comparison.savings_vs_cash);
  const isSaving = savings > 0;

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">{comparison.vehicle_name}</h1>
          <p className="text-gray-600 mt-1">Shared comparison • {formatDate(comparison.created_at)}</p>
        </div>

        <Card variant="elevated">
          <CardContent className="px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Cash Price</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(comparison.price_cash)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Financing</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(comparison.total_leasing_cost)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Interest + Fees</p>
                <p className="text-2xl font-bold text-danger-600">{formatCurrency(comparison.total_interest_fees)}</p>
              </div>
              <div className={`text-center p-4 rounded-lg ${isSaving ? 'bg-success-50' : 'bg-danger-50'}`}>
                <p className="text-sm text-gray-500">{isSaving ? 'You Save' : 'Extra Cost'}</p>
                <p className={`text-2xl font-bold ${isSaving ? 'text-success-600' : 'text-danger-600'}`}>
                  {formatCurrency(Math.abs(savings))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Financing Details</h2>
              <Badge variant="info">{comparison.source_name}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <p className="text-gray-500">Down Payment</p>
                <p className="font-medium">{formatCurrency(comparison.down_payment)}</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Payment</p>
                <p className="font-medium">{formatCurrency(comparison.monthly_payment)}</p>
              </div>
              <div>
                <p className="text-gray-500">Term</p>
                <p className="font-medium">{comparison.months} months</p>
              </div>
              <div>
                <p className="text-gray-500">TAE</p>
                <p className="font-medium">{formatPercent(comparison.tae)}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Key Rates</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">TIN: {formatPercent(comparison.tin)}</Badge>
                <Badge variant="info">TAE: {formatPercent(comparison.tae)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <AlertsPanel alerts={comparison.alerts} title="Analysis" />

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Share This Comparison</h3>
          </CardHeader>
          <CardContent>
            <ShareButton slug={slug!} vehicleName={comparison.vehicle_name} />
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-6">
          <p>Generated by <strong>Préstamos Familia</strong> — Understand the real cost of car financing</p>
          <p className="mt-1">This is not financial advice. Consult a professional before making decisions.</p>
        </div>
      </div>
    </PublicLayout>
  );
}
