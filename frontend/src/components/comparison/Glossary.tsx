import { useState } from 'react';
import { Input } from '@/components/ui/Input';

const terms = [
  {
    term: 'TIN (Tipo de Interés Nominal)',
    definition:
      'El interés "puro" que cobra la entidad por prestarte el dinero. No incluye comisiones ni seguros, así que no sirve para comparar ofertas entre sí.',
  },
  {
    term: 'TAE (Tasa Anual Equivalente)',
    definition:
      'El coste real del préstamo en un año: incluye el interés, las comisiones y los gastos obligatorios. Es el número que hay que comparar entre ofertas: cuanto más baja, mejor.',
  },
  {
    term: 'Entrada',
    definition:
      'El dinero que pagas al principio de tu bolsillo. Cuanta más entrada, menos dinero pides prestado y menos intereses pagas.',
  },
  {
    term: 'Importe financiado',
    definition: 'Lo que realmente te prestan: el precio al contado menos la entrada. Sobre esta cantidad se calculan los intereses.',
  },
  {
    term: 'Cuota mensual',
    definition:
      'Lo que pagas cada mes. Una cuota baja no significa un préstamo barato: suele conseguirse alargando el plazo, y entonces pagas más intereses en total.',
  },
  {
    term: 'Plazo',
    definition:
      'Número de meses durante los que pagas. A más plazo, cuota más baja pero más intereses totales. En plazos muy largos lo que compraste puede valer menos de lo que aún debes.',
  },
  {
    term: 'Comisión de apertura',
    definition:
      'Lo que cobra la entidad solo por concederte el préstamo, normalmente un porcentaje del importe financiado. Se puede negociar y muchas entidades no la cobran.',
  },
  {
    term: 'Comisión por amortización anticipada',
    definition:
      'Penalización por devolver el préstamo (o parte) antes de tiempo. Por ley está limitada, pero conviene que sea del 0% para poder cancelar si te viene bien.',
  },
  {
    term: 'Seguro vinculado',
    definition:
      'Seguro de vida o de protección de pagos que la entidad te pide contratar con el préstamo. Encarece la operación; pregunta siempre si es obligatorio y cuánto cuesta.',
  },
  {
    term: 'Valor residual o cuota final',
    definition:
      'En algunas ofertas (sobre todo de coches, tipo "multiopción") las cuotas son bajas porque al final queda un pago grande pendiente. Para que sea tuyo tendrás que pagarlo o refinanciarlo.',
  },
  {
    term: 'Leasing y renting',
    definition:
      'En el leasing pagas por usar algo (normalmente un vehículo) con opción a comprarlo al final. En el renting pagas un alquiler con servicios incluidos y nunca es tuyo.',
  },
  {
    term: 'Ratio de endeudamiento',
    definition:
      'Qué parte de tus ingresos mensuales se va en pagar deudas. Se recomienda que todas tus cuotas juntas no pasen del 30-35% de lo que ingresas.',
  },
  {
    term: 'Fondo de emergencia',
    definition:
      'Ahorros que conviene no tocar para imprevistos: entre 3 y 6 meses de gastos. No lo gastes entero en la entrada.',
  },
];

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function Glossary() {
  const [query, setQuery] = useState('');
  const needle = normalize(query.trim());
  const filtered = terms.filter(t => normalize(t.term).includes(needle) || normalize(t.definition).includes(needle));

  return (
    <div className="space-y-4 py-4">
      <Input
        label="Buscar un término"
        type="search"
        placeholder="Ej: TAE, comisión, entrada..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No hay ningún término que coincida con "{query}".</p>
      ) : (
        <dl className="divide-y divide-gray-200">
          {filtered.map(({ term, definition }) => (
            <div key={term} className="py-4">
              <dt className="font-semibold text-gray-900">{term}</dt>
              <dd className="mt-1 text-sm text-gray-600">{definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
