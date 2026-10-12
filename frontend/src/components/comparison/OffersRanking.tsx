import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Verdict } from '@/components/comparison/Verdict';
import { formatCurrency, formatPercent } from '@/utils/format';
import { rankingVerdict } from '@/utils/verdict';
import type { OfferRanking } from '@/types/api';

/** Todas las ofertas de una compra, de la más barata a la más cara. */
export function OffersRanking({ ranking }: { ranking: OfferRanking }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Comparativa de ofertas</h2>
        <p className="text-sm text-gray-600 mt-1">Ordenadas por lo que acabas pagando en total, de menos a más.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Verdict>{rankingVerdict(ranking.offers)}</Verdict>

        {/* La tabla se desplaza dentro de su caja en pantallas estrechas, sin ensanchar la página */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th scope="col" className="py-2 pr-4 font-medium">Oferta</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Coste total</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Frente al contado</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Entrada</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Cuota mensual</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Plazo</th>
                <th scope="col" className="py-2 px-3 font-medium text-right">Cuota final</th>
                <th scope="col" className="py-2 pl-3 font-medium text-right">TAE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ranking.offers.map(offer => {
                const extra = parseFloat(offer.total_interest_fees);
                return (
                  <tr key={offer.offer_id} className={offer.is_cheapest ? 'bg-success-50/60' : undefined}>
                    <th scope="row" className="py-3 pr-4 text-left font-medium text-gray-900">
                      <Link to={`/compare/${ranking.purchase_id}/${offer.offer_id}`} className="hover:underline">
                        {offer.source_name}
                      </Link>
                      {(offer.is_cheapest || offer.has_lowest_payment) && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {offer.is_cheapest && <Badge variant="success">La más barata</Badge>}
                          {offer.has_lowest_payment && <Badge variant="info">Cuota más baja</Badge>}
                        </span>
                      )}
                    </th>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrency(offer.total_financing_cost)}</td>
                    <td className={`py-3 px-3 text-right font-medium whitespace-nowrap ${extra > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                      {extra > 0 ? '+' : extra < 0 ? '−' : ''}{formatCurrency(Math.abs(extra))}
                    </td>
                    <td className="py-3 px-3 text-right">{formatCurrency(offer.down_payment)}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(offer.monthly_payment)}</td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">{offer.months} meses</td>
                    <td className="py-3 px-3 text-right">{offer.residual_value ? formatCurrency(offer.residual_value) : '—'}</td>
                    <td className="py-3 pl-3 text-right">{formatPercent(offer.tae)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 text-gray-600">
                <th scope="row" className="py-3 pr-4 text-left font-medium">Al contado</th>
                <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrency(ranking.price_cash)}</td>
                <td colSpan={6} />
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
