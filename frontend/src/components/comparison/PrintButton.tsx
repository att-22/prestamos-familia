import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Abre el diálogo de impresión del navegador, que en todos permite «Guardar como PDF».
 * La página tiene estilos de impresión: solo sale el análisis, sin menús ni botones.
 */
export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <FileDown className="h-4 w-4 mr-1" />
      Guardar como PDF
    </Button>
  );
}

/** Cabecera que solo aparece en el papel: de dónde sale el documento y de cuándo es. */
export function PrintHeader({ date }: { date: string }) {
  return (
    <p className="hidden border-b border-gray-300 pb-2 text-xs text-gray-500 print:block">
      Préstamos Familia · Comparativa de financiación · {date} · No es asesoramiento financiero
    </p>
  );
}
