import { describe, expect, it } from 'vitest';
import { alertText } from './alerts';
import type { Alert } from '@/types/api';

const plain = (text: string) => text.replace(/\s/g, ' ');

function alert(message: string, params?: Alert['params']): Alert {
  return { type: 'info', code: 'TEST', message, params };
}

describe('alertText', () => {
  it('escribe porcentajes con coma y sin ceros de relleno', () => {
    const text = alertText(alert('La TAE ({tae}) supera al TIN ({tin}) en {diff} puntos.', {
      tae: { value: '7.20', kind: 'percent' },
      tin: { value: '6.00', kind: 'percent' },
      diff: { value: '1.20', kind: 'number' },
    }));

    expect(text).toBe('La TAE (7,2%) supera al TIN (6%) en 1,2 puntos.');
  });

  it('escribe importes en euros con punto de millar', () => {
    const text = alertText(alert('Financiar cuesta {amount} más que pagar al contado.', {
      amount: { value: '5279.20', kind: 'currency' },
    }));

    expect(plain(text)).toBe('Financiar cuesta 5.279,20 € más que pagar al contado.');
  });

  it('deja tal cual las alertas guardadas antes, que ya traen las cifras en el texto', () => {
    expect(alertText(alert('La TAE del 7.20% es moderada.'))).toBe('La TAE del 7.20% es moderada.');
  });

  it('no rompe el texto si falta un valor', () => {
    expect(alertText(alert('Plazo de {months} meses.', {}))).toBe('Plazo de {months} meses.');
  });
});
