import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatNumber, formatPercent } from './format';

// Intl separa el símbolo con un espacio duro (U+00A0); lo normalizamos para comparar
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('formatCurrency', () => {
  it('formatea euros con formato español', () => {
    expect(plain(formatCurrency(25000))).toBe('25.000,00 €');
  });

  it('acepta los decimales que llegan de la API como texto', () => {
    expect(plain(formatCurrency('391.32'))).toBe('391,32 €');
  });

  it('muestra un guion cuando el valor no es un número', () => {
    expect(formatCurrency('')).toBe('—');
  });
});

describe('formatPercent', () => {
  it('formatea porcentajes con coma decimal', () => {
    expect(formatPercent('7.2')).toBe('7,20%');
  });
});

describe('formatNumber', () => {
  it('respeta el número de decimales pedido', () => {
    expect(formatNumber(1.005, 0)).toBe('1');
  });
});

describe('formatDate', () => {
  it('usa día/mes/año', () => {
    expect(formatDate('2026-03-05T12:00:00Z')).toBe('05/03/2026');
  });
});

describe('separador de miles', () => {
  it('se pone también en los números de cuatro cifras', () => {
    expect(plain(formatCurrency('5279.20'))).toBe('5.279,20 €');
    expect(formatNumber(1200, 0)).toBe('1.200');
  });
});
