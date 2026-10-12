import { formatCurrency, formatPercent } from '@/utils/format';
import type { OfferSummary } from '@/types/api';

interface OfferVerdictInput {
  priceCash: string;
  // Coste total financiando menos precio al contado
  extraCost: string;
  months: number;
  sourceName?: string;
}

/** El resultado de una oferta frente al contado, en una frase. */
export function offerVerdict({ priceCash, extraCost, months, sourceName }: OfferVerdictInput): string {
  const extra = parseFloat(extraCost);
  const price = parseFloat(priceCash);
  const subject = sourceName ? `Financiar con ${sourceName}` : 'Financiar';

  if (extra > 0) {
    const share = price > 0 ? `, un ${formatPercent(extra / price * 100, 1)} sobre el precio` : '';
    return `${subject} te cuesta ${formatCurrency(extra)} más que pagar al contado${share}, a cambio de repartir el pago en ${months} meses.`;
  }
  if (extra < 0) {
    return `${subject} te sale ${formatCurrency(-extra)} más barato que pagar al contado.`;
  }
  return `${subject} te cuesta lo mismo que pagar al contado y repartes el pago en ${months} meses.`;
}

/** Cuál de varias ofertas conviene, en una o dos frases. Espera las ofertas de más barata a más cara. */
export function rankingVerdict(offers: OfferSummary[]): string {
  if (offers.length < 2) return '';

  const cheapest = offers[0];
  const dearest = offers[offers.length - 1];
  const extra = parseFloat(cheapest.total_interest_fees);
  const gap = parseFloat(dearest.total_financing_cost) - parseFloat(cheapest.total_financing_cost);

  const vsCash = extra > 0
    ? `te cuesta ${formatCurrency(extra)} más que pagar al contado`
    : extra < 0
      ? `te sale ${formatCurrency(-extra)} más barata que pagar al contado`
      : 'te cuesta lo mismo que pagar al contado';

  if (gap === 0) {
    return `Todas las ofertas cuestan lo mismo en total: cada una ${vsCash}.`;
  }

  let verdict = `La más barata es ${cheapest.source_name}: ${vsCash} y ${formatCurrency(gap)} menos que la más cara (${dearest.source_name}).`;

  // La cuota más baja suele ser la que más tienta, y no siempre es la que menos cuesta
  const lowestPayment = offers.find(offer => offer.has_lowest_payment);
  if (lowestPayment && !lowestPayment.is_cheapest) {
    const more = parseFloat(lowestPayment.total_financing_cost) - parseFloat(cheapest.total_financing_cost);
    verdict += ` Ojo: ${lowestPayment.source_name} tiene la cuota más baja (${formatCurrency(lowestPayment.monthly_payment)} al mes), pero en total cuesta ${formatCurrency(more)} más.`;
  }
  return verdict;
}
