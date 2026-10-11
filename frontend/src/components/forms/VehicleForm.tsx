import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/ui/Tooltip';

const vehicleSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  price_cash: z.string().min(1, 'Precio requerido').refine(v => parseFloat(v) > 0, 'Debe ser mayor que 0'),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional().refine(v => !v || (parseInt(v) >= 1990 && parseInt(v) <= 2030), 'Año inválido'),
  is_used: z.boolean().default(false),
  notes: z.string().optional(),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  initialData?: Partial<VehicleFormData>;
  onSubmit: (data: VehicleFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function VehicleForm({ initialData, onSubmit, onCancel, isLoading, submitLabel = 'Guardar vehículo' }: VehicleFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: '',
      price_cash: '',
      brand: '',
      model: '',
      year: '',
      is_used: false,
      notes: '',
      ...initialData,
    },
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Datos del vehículo</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              {...register('name')}
              label="Nombre del vehículo *"
              placeholder="Ej: Toyota Corolla 2024"
              error={errors.name?.message}
            />
            <Input
              {...register('price_cash')}
              label="Precio al contado *"
              type="number"
              step="0.01"
              min="0"
              placeholder="25000"
              error={errors.price_cash?.message}
            />
          </div>
          
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
