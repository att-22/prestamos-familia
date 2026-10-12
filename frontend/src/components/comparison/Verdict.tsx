import { Lightbulb } from 'lucide-react';

/** La conclusión del análisis en una frase, antes de las cifras. */
export function Verdict({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 px-5 py-4" data-testid="verdict">
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
      <p className="text-base font-medium text-gray-900 sm:text-lg">{children}</p>
    </div>
  );
}
