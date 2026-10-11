import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/ui/Tooltip';

const offerSchema = z.object({
  source_name: z.string().min(1, 'Nombre requerido'),
  down_payment: z.string().min(1, 'Entrada requerida').refine(v => parseFloat(v) >= 0, 'Debe ser 0 o mayor'),
  tin: z.string().min(1, 'TIN requerido').refine(v => parseFloat(v) >= 0 && parseFloat(v) <= 100, 'TIN entre 0-100%'),
  tae: z.string().min(1, 'TAE requerida').refine(v => parseFloat(v) >= 0 && parseFloat(v) <= 100, 'TAE entre 0-100%'),
  months: z.string().min(1, 'Plazo requerido').refine(v => parseInt(v) >= 1 && parseInt(v) <= 120, 'Plazo 1-120 meses'),
  monthly_payment: z.string().min(1, 'Cuota requerida').refine(v => parseFloat(v) > 0, 'Debe ser mayor que 0'),
  opening_fee: z.string().optional().default('0'),
  opening_fee_percent: z.string().optional().default('0'),
  early_repayment_fee_percent: z.string().optional().default('0'),
  mandatory_insurance_year: z.string().optional().default('0'),
  residual_value: z.string().optional(),
  residual_value_percent: z.string().optional(),
  notes: z.string().optional(),
});

export type FinancingOfferFormData = z.infer<typeof offerSchema>;

interface FinancingOfferFormProps {
  initialData?: Partial<FinancingOfferFormData>;
  onSubmit: (data: FinancingOfferFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function FinancingOfferForm({ initialData, onSubmit, onCancel, isLoading, submitLabel = 'Guardar oferta' }: FinancingOfferFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FinancingOfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      source_name: '',
      down_payment: '0',
      tin: '',
      tae: '',
      months: '60',
      monthly_payment: '',
      opening_fee: '0',
      opening_fee_percent: '0',
      early_repayment_fee_percent: '0',
      mandatory_insurance_year: '0',
      residual_value: '',
      residual_value_percent: '',
      notes: '',
      ...initialData,
    },
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Oferta de financiaci&oacute;n</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            {...register('source_name')}
            label="Entidad que financia *"
            placeholder="Ej: tu banco, la financiera de la tienda..."
            error={errors.source_name?.message}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              {...register('down_payment')}
              label="Entrada inicial *"
              type="number"
              step="0.01"
              min="0"
              placeholder="5000"
              error={errors.down_payment?.message}
            />
            <Input
              {...register('tin')}
              label="TIN % *"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="5.5"
              error={errors.tin?.message}
            />
            <Input
              {...register('tae')}
              label="TAE % *"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="6.2"
              error={errors.tae?.message}
            />
            <Input
              {...register('months')}
              label="Plazo (meses) *"
              type="number"
              min="1"
              max="120"
              placeholder="60"
              error={errors.months?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              {...register('monthly_payment')}
              label="Cuota mensual *"
              type="number"
              step="0.01"
              min="0"
              placeholder="420"
              error={errors.monthly_payment?.message}
            />
            <Input
              {...register('opening_fee')}
              label="Comisi&oacute;n apertura (&euro;)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              error={errors.opening_fee?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              {...register('opening_fee_percent')}
              label="Comisi&oacute;n apertura %"
              type="number"
              step="0.01"
              min="0"
              max="10"
              placeholder="0"
              error={errors.opening_fee_percent?.message}
            />
            <Input
              {...register('early_repayment_fee_percent')}
              label="Comisi&oacute;n amort. anticipada %"
              type="number"
              step="0.01"
              min="0"
              max="10"
              placeholder="0"
              error={errors.early_repayment_fee_percent?.message}
            />
            <Input
              {...register('mandatory_insurance_year')}
              label="Seguro obligatorio/a&ntilde;o (&euro;)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              error={errors.mandatory_insurance_year?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              {...register('residual_value')}
              label="Cuota final / valor residual (&euro;)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Solo si queda un pago al final"
              helperText="Lo que hay que pagar al acabar las cuotas para que sea tuyo."
              error={errors.residual_value?.message}
            />
            <Input
              {...register('residual_value_percent')}
              label="...o como % del precio"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="% sobre precio"
              helperText="Solo se usa si no indicas el importe en euros."
              error={errors.residual_value_percent?.message}
            />
          </div>

          <InfoTooltip
            label="Diferencia TIN vs TAE"
            content={
              <div className="space-y-2">
                <p><strong>TIN:</strong> Inter&eacute;s nominal, no incluye comisiones ni seguros.</p>
                <p><strong>TAE:</strong> Coste real total anual. Incluye comisiones, seguros y frecuencia de pagos.</p>
                <p className="text-warning-600">Si la TAE supera al TIN en m&aacute;s de 1 punto, revisa comisiones y seguros obligatorios.</p>
              </div>
            }
          />

          <Input
            {...register('notes')}
            label="Notas"
            placeholder="Observaciones: condiciones especiales, promociones..."
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