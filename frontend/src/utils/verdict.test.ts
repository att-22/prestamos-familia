import { describe, expect, it } from 'vitest';
import { offerVerdict, rankingVerdict } from './verdict';
import type { OfferSummary } from '@/types/api';

// Intl separa el símbolo con un espacio duro (U+00A0); lo normalizamos para comparar
const plain = (text: string) => text.replace(/\s/g, ' ');

function offer(overrides: Partial<OfferSummary>): OfferSummary {
  return {
    offer_id: 'id',
    source_name: 'Banco',
    down_payment: '5000.00',
    monthly_payment: '391.32',
    months: 60,
    tin: '6.50',
    tae: '7.20',
    effective_annual_rate: '7.31',
    residual_value: null,
    total_payments: '23479.20',
    total_financing_cost: '28779.20',
    total_interest_fees: '3779.20',
    is_cheapest: false,
    has_lowest_payment: false,
    ...overrides,
  };
}

describe('offerVerdict', () => {
  it('dice cuánto cuesta de más financiar y qué parte del precio supone', () => {
    const verdict = offerVerdict({ priceCash: '25000.00', extraCost: '3779.20', months: 60, sourceName: 'Banco Ejemplo' });

    expect(plain(verdict)).toBe(
      'Financiar con Banco Ejemplo te cuesta 3779,20 € más que pagar al contado, un 15,1% sobre el precio, a cambio de repartir el pago en 60 meses.',
    );
  });

  it('dice cuánto se ahorra cuando financiar sale más barato', () => {
    const verdict = offerVerdict({ priceCash: '25000.00', extraCost: '-300.00', months: 24 });

    expect(plain(verdict)).toBe('Financiar te sale 300,00 € más barato que pagar al contado.');
  });

  it('reconoce una financiación sin coste', () => {
    const verdict = offerVerdict({ priceCash: '900.00', extraCost: '0.00', months: 12 });

    expect(verdict).toBe('Financiar te cuesta lo mismo que pagar al contado y repartes el pago en 12 meses.');
  });
});

describe('rankingVerdict', () => {
  const short = offer({
    source_name: 'Banco Corto', monthly_payment: '450.00', total_financing_cost: '26200.00',
    total_interest_fees: '1200.00', is_cheapest: true,
  });
  const long = offer({ source_name: 'Banco Largo', has_lowest_payment: true });

  it('no dice nada con una sola oferta', () => {
    expect(rankingVerdict([short])).toBe('');
  });

  it('señala la más barata y avisa de que la cuota más baja sale más cara', () => {
    expect(plain(rankingVerdict([short, long]))).toBe(
      'La más barata es Banco Corto: te cuesta 1200,00 € más que pagar al contado y 2579,20 € menos que la más cara (Banco Largo). ' +
      'Ojo: Banco Largo tiene la cuota más baja (391,32 € al mes), pero en total cuesta 2579,20 € más.',
    );
  });

  it('no añade el aviso cuando la más barata también tiene la cuota más baja', () => {
    const verdict = rankingVerdict([{ ...short, has_lowest_payment: true }, { ...long, has_lowest_payment: false }]);

    expect(verdict).not.toContain('Ojo');
  });

  it('avisa cuando todas cuestan lo mismo', () => {
    const verdict = rankingVerdict([{ ...long, is_cheapest: true }, { ...long, is_cheapest: true }]);

    expect(plain(verdict)).toBe('Todas las ofertas cuestan lo mismo en total: cada una te cuesta 3779,20 € más que pagar al contado.');
  });
});
