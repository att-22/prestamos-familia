import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShoppingBag, Calculator, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/format';
import { usePurchases, useCreatePurchase, useUpdatePurchase, useDeletePurchase } from '@/hooks/useApi';
import { PurchaseForm, type PurchaseFormData } from '@/components/forms/PurchaseForm';
import { getCategory } from '@/utils/categories';
import type { Purchase, PurchaseCreate } from '@/types/api';

function toPayload(data: PurchaseFormData): PurchaseCreate {
  // Los detalles de vehículo solo se guardan para esa categoría
  const isVehicle = data.category === 'vehicle';
  return {
    name: data.name,
    price_cash: data.price_cash,
    category: data.category,
    brand: (isVehicle && data.brand) || null,
    model: (isVehicle && data.model) || null,
    year: isVehicle && data.year ? parseInt(data.year, 10) : null,
    is_used: isVehicle && data.is_used,
    notes: data.notes || null,
  };
}

function toFormData(purchase: Purchase): PurchaseFormData {
  return {
    name: purchase.name,
    price_cash: purchase.price_cash,
    category: purchase.category,
    brand: purchase.brand ?? '',
    model: purchase.model ?? '',
    year: purchase.year?.toString() ?? '',
    is_used: purchase.is_used,
    notes: purchase.notes ?? '',
  };
}

export function Dashboard() {
  const { data: purchases = [], isLoading, isError } = usePurchases();
  const createPurchaseMutation = useCreatePurchase();
  const updatePurchaseMutation = useUpdatePurchase();
  const deletePurchaseMutation = useDeletePurchase();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingPurchase(null);
  };

  const handleSubmit = async (data: PurchaseFormData) => {
    if (editingPurchase) {
      await updatePurchaseMutation.mutateAsync({ id: editingPurchase.id, data: toPayload(data) });
    } else {
      await createPurchaseMutation.mutateAsync(toPayload(data));
    }
    closeModal();
  };

  const handleDeletePurchase = async (id: string) => {
    if (confirm('¿Seguro que quieres borrar esta compra con todas sus ofertas y comparativas?')) {
      await deletePurchaseMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis compras</h1>
          <p className="text-gray-600">Apunta lo que quieres comprar y compara las ofertas de financiación que te den</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir compra
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
            No se han podido cargar tus compras. Inténtalo de nuevo en unos segundos.
          </CardContent>
        </Card>
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Todavía no hay compras</h3>
            <p className="text-gray-600 mb-4">Añade lo que quieres comprar (un coche, un electrodoméstico, una reforma...) para comparar ofertas de financiación</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir mi primera compra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map(purchase => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              onEdit={setEditingPurchase}
              onDelete={handleDeletePurchase}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPurchase) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <PurchaseForm
              initialData={editingPurchase ? toFormData(editingPurchase) : undefined}
              onSubmit={handleSubmit}
              onCancel={closeModal}
              isLoading={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}
              submitLabel={editingPurchase ? 'Guardar cambios' : 'Crear compra'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseCard({ purchase, onEdit, onDelete }: {
  purchase: Purchase;
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: string) => void;
}) {
  const category = getCategory(purchase.category);
  const details = [purchase.brand, purchase.model, purchase.year ? `(${purchase.year})` : null].filter(Boolean).join(' ');

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="flex items-start gap-3">
          <category.icon className="h-5 w-5 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-gray-900">{purchase.name}</h3>
            <p className="text-sm text-gray-500">{details || category.label}</p>
          </div>
        </div>
        {purchase.is_used && <Badge variant="info">Ocasión</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Precio al contado</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(purchase.price_cash)}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/purchases/${purchase.id}`} className="flex-1">
            <Button variant="primary" size="sm" className="w-full">
              <Calculator className="h-4 w-4 mr-1" />
              Ver ofertas
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => onEdit(purchase)} aria-label={`Editar ${purchase.name}`}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(purchase.id)} aria-label={`Borrar ${purchase.name}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
