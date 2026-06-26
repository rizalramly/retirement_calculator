// All money is shown with the en-MY locale, e.g. RM 1,048,764.

const rmWhole = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  maximumFractionDigits: 0,
});

const numberWhole = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 });

/** Format an amount as Malaysian Ringgit with no decimals, e.g. "RM 1,048,764". */
export function formatRM(value: number): string {
  // Intl renders MYR as "RM 1,234"; normalise any non-breaking space.
  return rmWhole.format(Math.round(value)).replace(' ', ' ');
}

/** Plain grouped integer, e.g. "1,048,764". */
export function formatNumber(value: number): string {
  return numberWhole.format(Math.round(value));
}

/** Compact RM for axis ticks, e.g. "RM 1.2M", "RM 480k". */
export function formatRMCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `RM ${Math.round(value / 1_000)}k`;
  return `RM ${Math.round(value)}`;
}
