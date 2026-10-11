import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Car, Calculator, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/utils/format';
import { useVehicles, useDeleteVehicle } from '@/hooks/useApi';
import { useCreateVehicle } from '@/hooks/useApi';
import { VehicleForm } from '@/components/forms/VehicleForm';
import { useAuth } from '@/hooks/useAuth';

export function Dashboard() {
  const { vehicles, isLoading, error, refetch } = useVehicles();
  const createVehicleMutation = useCreateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  const handleCreateVehicle = async (data: any) => {
    await createVehicleMutation.mutateAsync(data);
    setShowCreateModal(false);
    refetch();
  };

  const handleDeleteVehicle = async (id: string) => {
    if (confirm('Are you sure you want to delete this vehicle and all its offers/comparisons?')) {
      await deleteVehicleMutation.mutateAsync(id);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Vehicles</h1>
          <p className="text-gray-600">Track vehicles you're considering and compare financing offers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
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
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles yet</h3>
            <p className="text-gray-600 mb-4">Add a vehicle to start comparing financing offers</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Vehicle
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
              initialData={editingVehicle || undefined}
              onSubmit={handleCreateVehicle}
              isLoading={createVehicleMutation.isPending}
              submitLabel={editingVehicle ? 'Update Vehicle' : 'Create Vehicle'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle, onEdit, onDelete }: { 
  vehicle: any; 
  onEdit: (v: any) => void; 
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
          <p className="text-sm text-gray-500">{vehicle.brand} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}</p>
        </div>
        <Badge variant={vehicle.is_used ? 'info' : 'success'}>{vehicle.is_used ? 'Used' : 'New'}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Cash Price</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(vehicle.price_cash)}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/vehicles/${vehicle.id}/offers`}>
            <Button variant="outline" size="sm" className="flex-1">
              <Calculator className="h-4 w-4 mr-1" />
              Offers
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick
