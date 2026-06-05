import { differenceInDays, parseISO } from 'date-fns';

/**
 * Returns the Badge tone for a lot's expiry date:
 *   danger  — expired or < 7 days remaining (red)
 *   warning — 7–30 days remaining (yellow)
 *   success — more than 30 days remaining (green)
 */
export function getVencimientoTone(fechaVencimiento) {
  const dias = differenceInDays(parseISO(fechaVencimiento), new Date());
  if (dias < 7) return 'danger';
  if (dias <= 30) return 'warning';
  return 'success';
}

export function getVencimientoLabel(fechaVencimiento) {
  const dias = differenceInDays(parseISO(fechaVencimiento), new Date());
  if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`;
  if (dias === 0) return 'Vence hoy';
  return `${dias}d restantes`;
}
