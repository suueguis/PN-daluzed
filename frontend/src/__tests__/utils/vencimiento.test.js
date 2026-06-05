import { describe, it, expect } from 'vitest';
import { getVencimientoTone, getVencimientoLabel } from '../../utils/vencimiento';

function isoFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('getVencimientoTone', () => {
  it('devuelve danger para fecha ya vencida', () => {
    expect(getVencimientoTone(isoFromNow(-1))).toBe('danger');
  });

  it('devuelve danger para menos de 7 días', () => {
    expect(getVencimientoTone(isoFromNow(3))).toBe('danger');
  });

  it('devuelve warning para 15 días (zona amarilla)', () => {
    expect(getVencimientoTone(isoFromNow(15))).toBe('warning');
  });

  it('devuelve warning para 25 días (zona amarilla)', () => {
    expect(getVencimientoTone(isoFromNow(25))).toBe('warning');
  });

  it('devuelve success para 60 días (zona verde)', () => {
    expect(getVencimientoTone(isoFromNow(60))).toBe('success');
  });
});

describe('getVencimientoLabel', () => {
  it('muestra "Vencido hace Xd" para fechas pasadas', () => {
    const label = getVencimientoLabel(isoFromNow(-3));
    expect(label).toMatch(/Vencido hace \d+d/);
  });

  it('muestra días restantes para fechas futuras', () => {
    const label = getVencimientoLabel(isoFromNow(15));
    expect(label).toMatch(/\d+d restantes/);
  });
});
