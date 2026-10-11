import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { categories } from '@/utils/categories';

const purchaseSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  price_cash: z.string().min(1, 'Precio requerido').refine(v => parseFloat(v) > 0, 'Debe ser mayor que 0'),
  category: z.enum(['vehicle', 'home', 'renovation', 'electronics', 'other']),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional().refine(v => !v || (parseInt(v) >= 1990 && parseInt(v) <= 2030), 'Año inválido'),
  is_used: z.boolean().default(false),
  notes: z.string().optional(),
});

export type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface PurchaseFormProps {
  initialData?: Partial<PurchaseFormData>;
  onSubmit: (data: PurchaseFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function PurchaseForm({ initialData, onSubmit, onCancel, isLoading, submitLabel = 'Guardar compra' }: PurchaseFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      name: '',
      price_cash: '',
      category: 'other',
      brand: '',
      model: '',
      year: '',
      is_used: false,
      notes: '',
      ...initialData,
    },
  });

  const isVehicle = watch('category') === 'vehicle';

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">¿Qué quieres comprar?</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Select
            {...register('category')}
            label="Tipo de compra"
            options={categories.map(({ value, label }) => ({ value, label }))}
            error={errors.category?.message}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              {...register('name')}
              label="Nombre *"
              placeholder={isVehicle ? 'Ej: Toyota Corolla 2024' : 'Ej: Lavadora, reforma del baño...'}
              error={errors.name?.message}
            />
            <Input
              {...register('price_cash')}
              label="Precio al contado *"
              type="number"
              step="0.01"
              min="0"
              placeholder={isVehicle ? '25000' : '1200'}
              helperText="Lo que costaría si lo pagaras de una vez."
              error={errors.price_cash?.message}
            />
          </div>

          {isVehicle && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  {...register('brand')}
                  label="Marca"
                  placeholder="Toyota"
                  error={errors.brand?.message}
                />
                <Input
                  {...register('model')}
                  label="Modelo"
                  placeholder="Corolla"
                  error={errors.model?.message}
                />
                <Input
                  {...register('year')}
                  label="Año"
                  type="number"
                  min="1990"
                  max="2030"
                  placeholder="2024"
                  error={errors.year?.message}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('is_used')}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Vehículo de segunda mano</span>
                </label>
                <InfoTooltip
                  label="¿Por qué importa?"
                  content="Los vehículos de ocasión pueden tener plazos máximos de financiación más cortos y tasas de interés diferentes."
                />
              </div>
            </>
          )}

          <Input
            {...register('notes')}
            label="Notas"
            placeholder="Observaciones adicionales..."
            error={errors.notes?.message}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
