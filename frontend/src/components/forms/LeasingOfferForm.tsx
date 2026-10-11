import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { InfoTooltip } from '@/components/ui/Tooltip';

const leasingSchema = z.object({
  source_name: z.string().min(1, 'Nombre requerido'),
  down_payment: z.string().min(1, 'Entrada requerida').refine(v => parseFloat(v) >= 0, 'Debe ser 0 o mayor'),
  tin: z.string().min(1, 'TIN requerido').refine(v => parseFloat(v) >= 0 && parseFloat(v) <= 100, 'TIN entre 0-100%'),
  tae: z.string().min(1, 'TAE requerida').refine(v => parseFloat(v) >= 0 && parseFloat(v) <= 100, 'TAE entre 0-100%'),
  months: z.string().min(1, 'Plazo requerido').refine(v => parseInt(v) >= 1 && parseInt(v) <= 120, 'Plazo 1-120 meses'),
  monthly_payment: z.string().min(1, 'Cuota requerida').refine(v => parseFloat(v) >= 0, 'Debe ser 0 o mayor'),
  opening_fee: z.string().optional().default('0'),
  opening_fee_percent: z.string().optional().default('0'),
  early_repayment_fee_percent: z.string().optional().default('0'),
  mandatory_insurance_year: z.string().optional().default('0'),
  residual_value: z.string().optional(),
  residual_value_percent: z.string().optional(),
  notes: z.string().optional(),
});

export type LeasingOfferFormData = z.infer<typeof leasingSchema>;

interface LeasingOfferFormProps {
  vehicleId: string;
  initialData?: Partial<LeasingOfferFormData>;
  onSubmit: (data: LeasingOfferFormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function LeasingOfferForm({ vehicleId, initialData, onSubmit, isLoading, submitLabel = 'Guardar oferta' }: LeasingOfferFormProps) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<LeasingOfferFormData>({
    resolver: zodResolver(leasingSchema),
    defaultValues: {
      source_name: '',
      down_payment: '0',
      tin: '0',
      tae: '0',
      months: '60',
      monthly_payment: '0',
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

  const tae = watch('tae');
  const tin = watch('tin');

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Oferta de financiación / leasing</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            {...register('source_name')}
            label="Entidad / Concesionario *"
            placeholder="Ej: Concesionario Pepe, Banco Santander"
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
              error={errors.tae?.me
