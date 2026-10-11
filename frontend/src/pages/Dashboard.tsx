import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Car, Calculator, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/format';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/hooks/useApi';
import { VehicleForm, type VehicleFormData } from '@/components/forms/VehicleForm';
import type { Vehicle, VehicleCreate } from '@/types/api';

function toPayload(data: VehicleFormData): VehicleCreate {
  return {
    name: data.name,
    price_cash: data.price_cash,
    brand: data.brand || null,
    model: data.model || null,
    year: data.year ? parseInt(data.year, 10) : null,
    is_used: data.is_used,
    notes: data.notes || null,
  };
}

function toFormData(vehicle: Vehicle): VehicleFormData {
  return {
    name: vehicle.name,
    price_cash: vehicle.price_cash,
    brand: vehicle.brand ?? '',
    model: vehicle.model ?? '',
    year: vehicle.year?.toString() ?? '',
    is_used: vehicle.is_used,
    notes: vehicle.notes ?? '',
  };
}

export function Dashboard() {
  const { data: vehicles = [], isLoading, isError } = useVehicles();
  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingVehicle(null);
  };

  const handleSubmit = async (data: VehicleFormData) => {
    if (editingVehicle) {
      await updateVehicleMutation.mutateAsync({ id: editingVehicle.id, data: toPayload(data) });
    } else {
      await createVehicleMutation.mutateAsync(toPayload(data));
    }
    closeModal();
  };

  const handleDeleteVehicle = async (id: string) => {
    if (confirm('¿Seguro que quieres borrar este vehículo con todas sus ofertas y comparativas?')) {
      await deleteVehicleMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis vehículos</h1>
          <p className="text-gray-600">Apunta los coches que estás mirando y compara las ofertas de financiación</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir vehículo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center text-danger-600">
            No se han podido cargar los vehículos. Inténtalo de nuevo en unos segundos.
          </CardContent>
        </Card>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Todavía no hay vehículos</h3>
            <p className="text-gray-600 mb-4">Añade un vehículo para empezar a comparar ofertas de financiación</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir mi primer vehículo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map(vehicle => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={setEditingVehicle}
              onDelete={handleDeleteVehicle}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingVehicle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <VehicleForm
              initialData={editingVehicle ? toFormData(editingVehicle) : undefined}
              onSubmit={handleSubmit}
              onCancel={closeModal}
              isLoading={createVehicleMutation.isPending || updateVehicleMutation.isPending}
              submitLabel={editingVehicle ? 'Guardar cambios' : 'Crear vehículo'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle, onEdit, onDelete }: {
  vehicle: Vehicle;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
          <p className="text-sm text-gray-500">{vehicle.brand} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}</p>
        </div>
        <Badge variant={vehicle.is_used ? 'info' : 'success'}>{vehicle.is_used ? 'Ocasión' : 'Nuevo'}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Precio al contado</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(vehicle.price_cash)}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/vehicles/${vehicle.id}`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full">
              <Calculator className="h-4 w-4 mr-1" />
              Ver ofertas
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => onEdit(vehicle)} aria-label={`Editar ${vehicle.name}`}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(vehicle.id)} aria-label={`Borrar ${vehicle.name}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
