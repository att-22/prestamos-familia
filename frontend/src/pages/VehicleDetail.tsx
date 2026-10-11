import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calculator, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatPercent, formatDate } from '@/utils/format';
import { useVehicle } from '@/hooks/useApi';
import { useLeasingOffers, useDeleteLeasingOffer } from '@/hooks/useApi';
import { LeasingOfferForm } from '@/components/forms/LeasingOfferForm';

export function VehicleDetail() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(vehicleId!);
  const { data: offers, isLoading: offersLoading, refetch } = useLeasingOffers(vehicleId);
  const deleteOfferMutation = useDeleteLeasingOffer();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);

  if (vehicleLoading) return <LoadingSkeleton />;

  const handleDeleteOffer = async (id: string) => {
    if (confirm('Delete this financing offer?')) {
      await deleteOfferMutation.mutateAsync(id);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vehicle?.name}</h1>
          <p className="text-gray-600">{vehicle?.brand} {vehicle?.model} {vehicle?.year ? `(${vehicle.year})` : ''}</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Cash Price</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(vehicle?.price_cash || '0')}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Financing Offers</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Offer
        </Button>
      </div>

      {offersLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <OfferSkeleton key={i} />)}
        </div>
      ) : offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No financing offers yet</h3>
            <p className="text-gray-600 mb-4">Add offers from dealers/banks to compare</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map(offer => (
            <OfferCard 
              key={offer.id} 
              offer={offer} 
              vehiclePrice={vehicle?.price_cash}
              onEdit={setEditingOffer}
              onDelete={handleDeleteOffer}
            />
          ))}
        </div>
      )}

      {(showCreateModal || editingOffer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <LeasingOfferForm
              vehicleId={vehicleId!}
              initialData={editingOffer || undefined}
              onSubmit={async (data) => {
                if (editingOffer) {
                  // Update logic would go here
                } else {
                  // Create logic would go here
                }
                setShowCreateModal(false);
                setEditingOffer(null);
                refetch();
              }}
              isLoading={false}
              submitLabel={editingOffer ? 'Update Offer' : 'Create Offer'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OfferCard({ offer, vehiclePrice, onEdit, onDelete }: any) {
  const financed = parseFloat(vehiclePrice || '0') - parseFloat(offer.down_payment);
  const totalPayments = parseFloat(offer.monthly_payment) * offer.months;
  const totalCost = parseFloat(offer.down_payment) + totalPayments + parseFloat(offer.mandatory_insurance_year) * offer.months / 12 + parseFloat(offer.opening_fee);
  const savings = parseFloat(vehiclePrice || '0') - totalCost;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{offer.source_name}</h3>
          <div className="flex flex-wrap gap-2 text-sm text-gray-500 mt-1">
            <span>{offer.months} months</span>
            <span>•</span>
            <span>TIN: {formatPercent(offer.tin)}</span>
            <span>•</span>
            <span>TAE: {formatPercent(offer.tae)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={savings >= 0 ? 'success' : 'danger'}>
            {savings >= 0 ? 'Save' : 'Extra cost'} {formatCurrency(Math.abs(savings))}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-gray-500">Down payment</p>
            <p className="font-medium">{formatCurrency(offer.down_payment)}</p>
          </div>
          <div>
            <p className="text-gray-500">Monthly payment</p>
            <p className="font-medium">{formatCurrency(offer.monthly_payment)}</p>
          </div>
          <div>
            <p className="text-gray-500">Total payments</p>
            <p className="font-medium">{formatCurrency(totalPayments)}</p>
          </div>
          <div>
            <p className="text-gray-500">Est. total cost</p>
            <p className="font-semibold">{formatCurrency(totalCost)}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Link to={`/compare/${vehicleId}/${offer.id}`}>
            <Button variant="primary" size="sm" className="flex-1">
              <Calculator className="h-4 w-4 mr-1" />
              Compare
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => onEdit(offer)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" variant="danger" onClick={() => onDelete(offer.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card><CardContent className="h-8 w-1/3 bg-gray-200 rounded" /></Card>
      <Card><CardContent className="h-20 bg-gray-200 rounded" /></Card>
      <div className="space-y-4">
        {[1, 2].map(i => <OfferSkeleton key={i} />)}
      </div>
    </div>
  );
}

function OfferSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="h-4 w-1/4 bg-gray-200 rounded" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-200 rounded" />)}
        </div>
        <div className="h-10 bg-gray-200 rounded" />
      </CardContent>
    </Card>
  );
}
