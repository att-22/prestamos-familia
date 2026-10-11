import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Plus, Calculator, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatPercent } from '@/utils/format';
import {
  useVehicle,
  useLeasingOffers,
  useCreateLeasingOffer,
  useUpdateLeasingOffer,
  useDeleteLeasingOffer,
} from '@/hooks/useApi';
import { LeasingOfferForm, type LeasingOfferFormData } from '@/components/forms/LeasingOfferForm';
import type { LeasingOffer, LeasingOfferCreate } from '@/types/api';

function toPayload(vehicleId: string, data: LeasingOfferFormData): LeasingOfferCreate {
  return {
    vehicle_id: vehicleId,
    source_name: data.source_name,
    down_payment: data.down_payment,
    tin: data.tin,
    tae: data.tae,
    months: parseInt(data.months, 10),
    monthly_payment: data.monthly_payment,
    opening_fee: data.opening_fee || '0',
    opening_fee_percent: data.opening_fee_percent || '0',
    early_repayment_fee_percent: data.early_repayment_fee_percent || '0',
    mandatory_insurance_year: data.mandatory_insurance_year || '0',
    residual_value: data.residual_value || null,
    residual_value_percent: data.residual_value_percent || null,
    notes: data.notes || null,
  };
}

function toFormData(offer: LeasingOffer): LeasingOfferFormData {
  return {
    source_name: offer.source_name,
    down_payment: offer.down_payment,
    tin: offer.tin,
    tae: offer.tae,
    months: offer.months.toString(),
    monthly_payment: offer.monthly_payment,
    opening_fee: offer.opening_fee,
    opening_fee_percent: offer.opening_fee_percent,
    early_repayment_fee_percent: offer.early_repayment_fee_percent,
    mandatory_insurance_year: offer.mandatory_insurance_year,
    residual_value: offer.residual_value ?? '',
    residual_value_percent: offer.residual_value_percent ?? '',
    notes: offer.notes ?? '',
  };
}

export function VehicleDetail() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(vehicleId!);
  const { data: offers = [], isLoading: offersLoading } = useLeasingOffers(vehicleId);
  const createOfferMutation = useCreateLeasingOffer();
  const updateOfferMutation = useUpdateLeasingOffer();
  const deleteOfferMutation = useDeleteLeasingOffer();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<LeasingOffer | null>(null);

  if (vehicleLoading) return <LoadingSkeleton />;

  if (!vehicle) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <h1 className="text-lg font-medium text-gray-900 mb-4">Vehículo no encontrado</h1>
          <Button onClick={() => navigate('/dashboard')}>Volver a mis vehículos</Button>
        </CardContent>
      </Card>
    );
  }

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingOffer(null);
  };

  const handleSubmit = async (data: LeasingOfferFormData) => {
    const payload = toPayload(vehicle.id, data);
    if (editingOffer) {
      await updateOfferMutation.mutateAsync({ id: editingOffer.id, data: payload });
    } else {
      await createOfferMutation.mutateAsync(payload);
    }
    closeModal();
  };

  const handleDeleteOffer = async (id: string) => {
    if (confirm('¿Borrar esta oferta de financiación?')) {
      await deleteOfferMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.name}</h1>
          <p className="text-gray-600">{vehicle.brand} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Precio al contado</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(vehicle.price_cash)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Ofertas de financiación</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir oferta
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Todavía no hay ofertas</h3>
            <p className="text-gray-600 mb-4">Añade las ofertas que te den el concesionario o el banco para compararlas</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir la primera oferta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              vehiclePrice={vehicle.price_cash}
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
              initialData={editingOffer ? toFormData(editingOffer) : undefined}
              onSubmit={handleSubmit}
              onCancel={closeModal}
              isLoading={createOfferMutation.isPending || updateOfferMutation.isPending}
              submitLabel={editingOffer ? 'Guardar cambios' : 'Crear oferta'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OfferCard({ offer, vehiclePrice, onEdit, onDelete }: {
  offer: LeasingOffer;
  vehiclePrice: string;
  onEdit: (offer: LeasingOffer) => void;
  onDelete: (id: string) => void;
}) {
  // Misma fórmula que el backend (services/calculations.py), para la vista rápida
  const price = parseFloat(vehiclePrice);
  const downPayment = parseFloat(offer.down_payment);
  const totalPayments = parseFloat(offer.monthly_payment) * offer.months;
  const insurance = parseFloat(offer.mandatory_insurance_year) * offer.months / 12;
  const fees = parseFloat(offer.opening_fee) + (price - downPayment) * parseFloat(offer.opening_fee_percent) / 100;
  const residual = offer.residual_value !== null
    ? parseFloat(offer.residual_value)
    : offer.residual_value_percent !== null
      ? price * parseFloat(offer.residual_value_percent) / 100
      : 0;
  const totalCost = downPayment + totalPayments + residual + insurance + fees;
  const extraCost = totalCost - price;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{offer.source_name}</h3>
          <div className="flex flex-wrap gap-2 text-sm text-gray-500 mt-1">
            <span>{offer.months} meses</span>
            <span>•</span>
            <span>TIN: {formatPercent(offer.tin)}</span>
            <span>•</span>
            <span>TAE: {formatPercent(offer.tae)}</span>
            {residual > 0 && (
              <>
                <span>•</span>
                <span className="text-warning-600 font-medium">Cuota final: {formatCurrency(residual)}</span>
              </>
            )}
          </div>
        </div>
        <Badge variant={extraCost > 0 ? 'danger' : 'success'}>
          {extraCost > 0 ? 'Cuesta de más' : 'Ahorra'} {formatCurrency(Math.abs(extraCost))}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-gray-500">Entrada</p>
            <p className="font-medium">{formatCurrency(offer.down_payment)}</p>
          </div>
          <div>
            <p className="text-gray-500">Cuota mensual</p>
            <p className="font-medium">{formatCurrency(offer.monthly_payment)}</p>
          </div>
          <div>
            <p className="text-gray-500">Total cuotas</p>
            <p className="font-medium">{formatCurrency(totalPayments)}</p>
          </div>
          <div>
            <p className="text-gray-500">Coste total</p>
            <p className="font-semibold">{formatCurrency(totalCost)}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <Link to={`/compare/${offer.vehicle_id}/${offer.id}`} className="flex-1 sm:flex-none">
            <Button variant="primary" size="sm" className="w-full">
              <Calculator className="h-4 w-4 mr-1" />
              Analizar oferta
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => onEdit(offer)}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(offer.id)} aria-label={`Borrar oferta de ${offer.source_name}`}>
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
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-200 rounded" />)}
        </div>
        <div className="h-10 bg-gray-200 rounded" />
      </CardContent>
    </Card>
  );
}
